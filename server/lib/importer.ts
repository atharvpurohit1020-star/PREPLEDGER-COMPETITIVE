import type pg from 'pg';
import { diagramRefs, renderContent } from '../../shared/content';
import {
  csvToQuestions,
  importFileSchema,
  type ImportFile,
  type QuestionImport,
  type ValidationIssue,
  type ValidationReport,
} from '../../shared/importSchema';
import { pool, refreshStats, tx, type Db } from '../db';
import { audit } from './audit';
import { contentHash, publicIdFor, searchTextFor, slugify, titleFromSlug } from './ids';
import { snapshotQuestion } from './questions';

const OPTION_TYPES = new Set(['mcq_single', 'mcq_multi', 'matrix_match', 'assertion_reason']);
const NUMERIC_TYPES = new Set(['numerical', 'integer']);

interface Taxonomy {
  exams: Map<string, { id: number; subjects: Map<string, { id: number; chapters: Map<string, { id: number; topics: Map<string, number> }> }> }>;
}

async function loadTaxonomy(db: Db): Promise<Taxonomy> {
  const rows = (
    await db.query(`
      SELECT e.id eid, e.slug es, s.id sid, s.slug ss, c.id cid, c.slug cs, t.id tid, t.slug ts
      FROM exams e JOIN subjects s ON s.exam_id = e.id JOIN chapters c ON c.subject_id = s.id
      LEFT JOIN topics t ON t.chapter_id = c.id`)
  ).rows;
  const exams: Taxonomy['exams'] = new Map();
  for (const r of rows) {
    if (!exams.has(r.es)) exams.set(r.es, { id: r.eid, subjects: new Map() });
    const e = exams.get(r.es)!;
    if (!e.subjects.has(r.ss)) e.subjects.set(r.ss, { id: r.sid, chapters: new Map() });
    const s = e.subjects.get(r.ss)!;
    if (!s.chapters.has(r.cs)) s.chapters.set(r.cs, { id: r.cid, topics: new Map() });
    if (r.tid) s.chapters.get(r.cs)!.topics.set(r.ts, r.tid);
  }
  return { exams };
}

function renderErrors(src: string, diagrams: Record<string, any>): string | null {
  const html = renderContent(src, { diagrams });
  const m = html.match(/class="katex-error"[^>]*title="([^"]*)"/);
  return m ? m[1].replace(/&#x27;|&#39;/g, "'").slice(0, 200) : null;
}

/** Parse raw upload (JSON text or CSV text) into an ImportFile-shaped object. */
export function parseUpload(format: 'json' | 'csv', content: string, csvSource?: unknown): { data: unknown; issues: ValidationIssue[] } {
  if (format === 'json') {
    try {
      return { data: JSON.parse(content), issues: [] };
    } catch (e) {
      return { data: null, issues: [{ level: 'error', path: 'json', message: `Invalid JSON: ${(e as Error).message}` }] };
    }
  }
  const { questions, errors } = csvToQuestions(content);
  return { data: { format_version: 1, source: csvSource, papers: [], diagrams: [], passages: [], questions }, issues: errors };
}

export async function validateImport(raw: unknown, preIssues: ValidationIssue[] = [], db: Db = pool): Promise<{ report: ValidationReport; file: ImportFile | null }> {
  const errors: ValidationIssue[] = preIssues.filter((i) => i.level === 'error');
  const warnings: ValidationIssue[] = preIssues.filter((i) => i.level === 'warning');
  const duplicates: ValidationReport['duplicates'] = [];
  const parsed = importFileSchema.safeParse(raw);
  if (!parsed.success) {
    for (const i of parsed.error.issues.slice(0, 200)) errors.push({ level: 'error', path: i.path.join('.') || '(root)', message: i.message });
    return { report: { ok: false, counts: { questions: 0, papers: 0, diagrams: 0, passages: 0 }, errors, warnings, duplicates }, file: null };
  }
  const file = parsed.data;
  const tax = await loadTaxonomy(db);
  const err = (path: string, message: string) => errors.push({ level: 'error', path, message });
  const warn = (path: string, message: string) => warnings.push({ level: 'warning', path, message });
  const officialAllowed = ['official_document', 'licensed_dataset', 'public_domain'].includes(file.source.source_type);

  // diagrams
  const diagramMap: Record<string, any> = {};
  const existingDiagrams = (await db.query('SELECT public_id, url, alt_text, caption, width, height FROM diagram_assets')).rows;
  for (const d of existingDiagrams) diagramMap[d.public_id] = d;
  const seenDiagram = new Set<string>();
  file.diagrams.forEach((d, i) => {
    if (seenDiagram.has(d.ref)) err(`diagrams[${i}].ref`, `duplicate diagram ref "${d.ref}"`);
    seenDiagram.add(d.ref);
    if (diagramMap[d.ref]) warn(`diagrams[${i}]`, `diagram "${d.ref}" already exists and will be reused`);
    diagramMap[d.ref] = { public_id: d.ref, url: d.url, alt_text: d.alt_text, caption: d.caption, width: d.width, height: d.height };
  });

  // passages
  const passageRefs = new Set(file.passages.map((p) => p.ref));
  const existingPassages = new Set((await db.query('SELECT public_id FROM passages')).rows.map((r) => r.public_id));

  // papers
  const paperKinds = new Map<string, string>();
  const paperNumbers = new Map<string, Set<number>>();
  const existingPapers = new Map<string, { id: number; kind: string; exam: string }>(
    (await db.query('SELECT p.id, p.public_id, p.kind, e.slug exam FROM papers p JOIN exams e ON e.id = p.exam_id')).rows.map((r) => [r.public_id, r]),
  );
  file.papers.forEach((p, i) => {
    if (!tax.exams.has(p.exam)) err(`papers[${i}].exam`, `unknown exam "${p.exam}"`);
    if (paperKinds.has(p.ref)) err(`papers[${i}].ref`, `duplicate paper ref "${p.ref}"`);
    paperKinds.set(p.ref, p.kind);
    if (existingPapers.has(publicIdFor(p.ref, 'paper:'))) warn(`papers[${i}]`, `paper "${p.ref}" already exists; questions will be attached to it`);
    if (p.kind === 'past_paper' && !p.year) err(`papers[${i}].year`, 'past papers need a year');
    if (p.kind === 'past_paper' && file.source.source_type === 'original_sample') err(`papers[${i}].kind`, 'original sample content cannot be labelled as a past paper');
    if (p.sections.length) {
      const keys = new Set<string>();
      p.sections.forEach((s, j) => {
        if (keys.has(s.key)) err(`papers[${i}].sections[${j}]`, `duplicate section key "${s.key}"`);
        keys.add(s.key);
      });
    }
  });
  const resolvePaper = (ref: string) => {
    if (paperKinds.has(ref)) return { kind: paperKinds.get(ref)!, pid: publicIdFor(ref, 'paper:') };
    const ex = existingPapers.get(ref) ?? existingPapers.get(publicIdFor(ref, 'paper:'));
    return ex ? { kind: ex.kind, pid: existingPapers.get(ref) ? ref : publicIdFor(ref, 'paper:') } : null;
  };
  const dbNumbers = new Map<string, Set<number>>();
  for (const r of (await db.query('SELECT p.public_id, pq.question_number FROM paper_questions pq JOIN papers p ON p.id = pq.paper_id')).rows) {
    if (!dbNumbers.has(r.public_id)) dbNumbers.set(r.public_id, new Set());
    dbNumbers.get(r.public_id)!.add(r.question_number);
  }

  // questions
  const seenRefs = new Set<string>();
  const hashes = new Map<string, string>();
  const dbQuestionIds = new Set((await db.query('SELECT public_id FROM questions')).rows.map((r) => r.public_id));
  const dbHashes = new Map<string, string[]>();
  for (const r of (await db.query(`SELECT public_id, content_hash FROM questions WHERE status <> 'archived'`)).rows) {
    if (!dbHashes.has(r.content_hash)) dbHashes.set(r.content_hash, []);
    dbHashes.get(r.content_hash)!.push(r.public_id);
  }

  file.questions.forEach((q, i) => {
    const p = `questions[${i}]`;
    if (seenRefs.has(q.ref)) err(`${p}.ref`, `duplicate question ref "${q.ref}" in file`);
    seenRefs.add(q.ref);
    if (dbQuestionIds.has(publicIdFor(q.ref, 'q:'))) err(`${p}.ref`, `question "${q.ref}" was already imported — edit it in the admin instead`);
    const exam = tax.exams.get(q.exam);
    const subject = exam?.subjects.get(q.subject);
    const chapter = subject?.chapters.get(q.chapter);
    if (!exam) err(`${p}.exam`, `unknown exam "${q.exam}"`);
    else if (!subject) err(`${p}.subject`, `unknown subject "${q.subject}" for ${q.exam}`);
    else if (!chapter) err(`${p}.chapter`, `unknown chapter "${q.chapter}" in ${q.exam}/${q.subject}`);
    for (const c of q.also_chapters ?? []) if (subject && !subject.chapters.has(c)) err(`${p}.also_chapters`, `unknown chapter "${c}"`);
    for (const t of q.topics ?? []) if (chapter && !chapter.topics.has(t)) warn(`${p}.topics`, `topic "${t}" does not exist and will be created`);

    const labels = (q.options ?? []).map((o) => o.label);
    if (OPTION_TYPES.has(q.type)) {
      if (labels.length < 2) err(`${p}.options`, `${q.type} needs at least two options`);
      if (new Set(labels).size !== labels.length) err(`${p}.options`, 'option labels must be unique');
      labels.forEach((l, j) => {
        if (l !== String.fromCharCode(65 + j)) err(`${p}.options[${j}].label`, 'option labels must run A, B, C, … in order');
      });
      if (!('options' in q.answer.value)) err(`${p}.answer`, `${q.type} needs an option-label answer`);
      else {
        for (const l of q.answer.value.options) if (!labels.includes(l)) err(`${p}.answer`, `answer option "${l}" is not among the options`);
        if (q.type !== 'mcq_multi' && q.answer.value.options.length > 1 && !['revised', 'disputed'].includes(q.answer.status))
          err(`${p}.answer`, 'single-correct questions may list several accepted options only when the key is revised or disputed');
      }
    }
    if (NUMERIC_TYPES.has(q.type)) {
      if (q.options?.length) err(`${p}.options`, `${q.type} questions must not have options`);
      if ('options' in q.answer.value) err(`${p}.answer`, `${q.type} needs a numeric or range answer`);
      if ('range' in q.answer.value && q.answer.value.range[0] > q.answer.value.range[1]) err(`${p}.answer`, 'range lower bound exceeds upper bound');
    }
    if (q.type === 'matrix_match' && !q.matrix) err(`${p}.matrix`, 'matrix_match questions need List-I / List-II data');
    if (q.passage && !passageRefs.has(q.passage) && !existingPassages.has(publicIdFor(q.passage, 'passage:'))) err(`${p}.passage`, `unknown passage "${q.passage}"`);

    // provenance rules
    if (q.is_pyq && ['original_sample', 'test_fixture', 'user_contribution'].includes(file.source.source_type))
      err(`${p}.is_pyq`, `a ${file.source.source_type} source cannot supply past-year questions`);
    if (q.is_pyq && !q.papers.some((x) => resolvePaper(x.paper)?.kind === 'past_paper')) err(`${p}.is_pyq`, 'past-year questions must be linked to a past paper');
    if (!officialAllowed && (q.answer.source === 'official' || (q.answer_history ?? []).some((h) => h.source === 'official')))
      err(`${p}.answer.source`, 'only official or licensed sources may label an answer key "official"');
    q.solutions.forEach((s, j) => {
      if (s.kind === 'official' && !officialAllowed) err(`${p}.solutions[${j}].kind`, 'only official or licensed sources may supply official solutions');
    });
    if (q.status === 'published' && q.verification_status === 'needs_correction') warn(`${p}.status`, 'publishing a question flagged needs_correction');

    // papers
    for (const [j, link] of q.papers.entries()) {
      const rp = resolvePaper(link.paper);
      if (!rp) {
        err(`${p}.papers[${j}].paper`, `unknown paper "${link.paper}"`);
        continue;
      }
      const set = paperNumbers.get(rp.pid) ?? new Set(dbNumbers.get(rp.pid) ?? []);
      if (set.has(link.number)) err(`${p}.papers[${j}].number`, `question number ${link.number} is already used in paper "${link.paper}"`);
      set.add(link.number);
      paperNumbers.set(rp.pid, set);
    }

    // diagrams & formulas
    const texts: [string, string][] = [
      [`${p}.body`, q.body],
      ...(q.options ?? []).map((o, j): [string, string] => [`${p}.options[${j}]`, o.body]),
      ...q.solutions.map((s, j): [string, string] => [`${p}.solutions[${j}]`, s.body]),
      ...(q.matrix ? [...q.matrix.left, ...q.matrix.right].map((m, j): [string, string] => [`${p}.matrix[${j}]`, m.body]) : []),
    ];
    for (const [path, t] of texts) {
      for (const d of diagramRefs(t)) if (!diagramMap[d]) err(path, `references unknown diagram "${d}"`);
      const e = renderErrors(t, diagramMap);
      if (e) err(path, `formula failed to render: ${e}`);
    }

    const h = contentHash(q.body, q.options ?? []);
    if (hashes.has(h)) duplicates.push({ ref: q.ref, matches: [hashes.get(h)!], reason: 'identical content to another question in this file' });
    else if (dbHashes.has(h)) duplicates.push({ ref: q.ref, matches: dbHashes.get(h)!, reason: 'identical content to existing question(s)' });
    hashes.set(h, q.ref);
  });
  for (const d of duplicates) warn(`questions(${d.ref})`, `possible duplicate: ${d.reason} (${d.matches.join(', ')})`);

  const report: ValidationReport = {
    ok: errors.length === 0,
    counts: { questions: file.questions.length, papers: file.papers.length, diagrams: file.diagrams.length, passages: file.passages.length },
    errors,
    warnings,
    duplicates,
  };
  return { report, file };
}

/** Commit a validated file. Throws if it no longer validates. Returns the batch id. */
export async function commitImport(raw: unknown, opts: { userId?: number | null; filename?: string; format?: 'json' | 'csv'; batchId?: number } = {}) {
  const { report, file } = await validateImport(raw);
  if (!report.ok || !file) {
    const e = new Error('Import does not validate');
    (e as any).report = report;
    throw e;
  }
  const result = await tx(async (c) => {
    const src = await c.query(
      `INSERT INTO source_records(source_type,title,publisher,url,license,rights_holder,permission_note,retrieved_at,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [file.source.source_type, file.source.title, file.source.publisher ?? null, file.source.url ?? null, file.source.license, file.source.rights_holder ?? null, file.source.permission_note, file.source.retrieved_at ?? null, file.source.notes ?? null],
    );
    const sourceId: number = src.rows[0].id;
    let batchId = opts.batchId;
    if (batchId) {
      await c.query(`UPDATE import_batches SET status='committed', committed_at=now(), report=$2 WHERE id=$1`, [batchId, report]);
    } else {
      batchId = (
        await c.query(`INSERT INTO import_batches(filename,format,status,report,created_by,committed_at) VALUES ($1,$2,'committed',$3,$4,now()) RETURNING id`, [
          opts.filename ?? null, opts.format ?? 'json', report, opts.userId ?? null,
        ])
      ).rows[0].id;
    }
    const tax = await loadTaxonomy(c);

    const diagramIds = new Map<string, number>();
    for (const d of file.diagrams) {
      const r = await c.query(
        `INSERT INTO diagram_assets(public_id,url,alt_text,caption,width,height,license,source_record_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (public_id) DO UPDATE SET public_id = EXCLUDED.public_id RETURNING id`,
        [d.ref, d.url, d.alt_text, d.caption ?? null, d.width ?? null, d.height ?? null, d.license, sourceId],
      );
      diagramIds.set(d.ref, r.rows[0].id);
    }
    const passageIds = new Map<string, { id: number; body: string }>();
    for (const p of file.passages) {
      const r = await c.query(`INSERT INTO passages(public_id,title,body) VALUES ($1,$2,$3) ON CONFLICT (public_id) DO UPDATE SET title = EXCLUDED.title RETURNING id, body`, [
        publicIdFor(p.ref, 'passage:'), p.title ?? null, p.body,
      ]);
      passageIds.set(p.ref, r.rows[0]);
    }
    const paperIds = new Map<string, number>();
    for (const p of file.papers) {
      const pid = publicIdFor(p.ref, 'paper:');
      const existing = await c.query('SELECT id FROM papers WHERE public_id = $1', [pid]);
      if (existing.rows[0]) {
        paperIds.set(p.ref, existing.rows[0].id);
        continue;
      }
      const r = await c.query(
        `INSERT INTO papers(public_id,exam_id,slug,title,kind,year,session,exam_date,shift,paper_number,language,duration_minutes,total_marks,marking_scheme,sections,availability,verification_status,source_record_id,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
        [pid, tax.exams.get(p.exam)!.id, p.slug ?? slugify(p.title), p.title, p.kind, p.year ?? null, p.session ?? null, p.exam_date ?? null, p.shift ?? null, p.paper_number ?? null,
          p.language ?? 'English', p.duration_minutes ?? null, p.total_marks ?? null, p.marking_scheme ? JSON.stringify(p.marking_scheme) : null, JSON.stringify(p.sections), p.availability, p.verification_status, sourceId, p.notes ?? null],
      );
      paperIds.set(p.ref, r.rows[0].id);
    }
    const paperIdFor = async (ref: string) => {
      if (paperIds.has(ref)) return paperIds.get(ref)!;
      const r = await c.query('SELECT id FROM papers WHERE public_id = $1 OR public_id = $2', [ref, publicIdFor(ref, 'paper:')]);
      return r.rows[0].id as number;
    };

    const touchedPapers = new Set<number>();
    for (const q of file.questions) {
      const exam = tax.exams.get(q.exam)!;
      const subject = exam.subjects.get(q.subject)!;
      const chapter = subject.chapters.get(q.chapter)!;
      let passage: { id: number; body: string } | undefined;
      if (q.passage) {
        passage = passageIds.get(q.passage) ?? (await c.query('SELECT id, body FROM passages WHERE public_id = $1', [publicIdFor(q.passage, 'passage:')])).rows[0];
      }
      const qr = await c.query(
        `INSERT INTO questions(public_id,exam_id,subject_id,chapter_id,passage_id,type,body,matrix,marks,negative_marks,difficulty,is_pyq,status,verification_status,source_record_id,source_ref,content_hash,search_text,import_batch_id,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
        [publicIdFor(q.ref, 'q:'), exam.id, subject.id, chapter.id, passage?.id ?? null, q.type, q.body, q.matrix ? JSON.stringify(q.matrix) : null, q.marks ?? null,
          q.negative_marks ?? null, q.difficulty ?? null, q.is_pyq, q.status, q.verification_status, sourceId, q.source_ref ?? q.ref,
          contentHash(q.body, q.options ?? []), searchTextFor(q.body, q.options ?? [], passage?.body), batchId, opts.userId ?? null],
      );
      const qid: number = qr.rows[0].id;
      await insertQuestionChildren(c, qid, q, chapter, sourceId);
      for (const link of q.papers) {
        const paperId = await paperIdFor(link.paper);
        touchedPapers.add(paperId);
        await c.query(`INSERT INTO paper_questions(paper_id,question_id,section_key,question_number,marks,negative_marks) VALUES ($1,$2,$3,$4,$5,$6)`, [
          paperId, qid, link.section ?? null, link.number, link.marks ?? null, link.negative_marks ?? null,
        ]);
      }
      for (const slug of q.also_chapters ?? []) {
        await c.query('INSERT INTO question_chapter_tags(question_id, chapter_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [qid, subject.chapters.get(slug)!.id]);
      }
      const all = [q.body, ...(q.options ?? []).map((o) => o.body), ...q.solutions.map((s) => s.body)].flatMap(diagramRefs);
      for (const d of new Set(all)) {
        const id = diagramIds.get(d) ?? (await c.query('SELECT id FROM diagram_assets WHERE public_id = $1', [d])).rows[0].id;
        await c.query('INSERT INTO question_diagrams(question_id, diagram_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [qid, id]);
      }
      await snapshotQuestion(c, qid, 'Imported', opts.userId ?? null);
    }
    for (const pid of touchedPapers) {
      await c.query(`UPDATE papers SET availability = 'partial', updated_at = now() WHERE id = $1 AND availability = 'metadata_only'`, [pid]);
    }
    await audit(c, opts.userId ?? null, 'import.commit', 'import_batch', String(batchId), { counts: report.counts, source: file.source.title });
    await refreshStats(c);
    return { batchId: batchId!, report };
  });
  return result;
}

export async function insertQuestionChildren(
  c: pg.PoolClient,
  qid: number,
  q: Pick<QuestionImport, 'options' | 'answer' | 'answer_history' | 'solutions' | 'topics'>,
  chapter: { id: number; topics: Map<string, number> } | null,
  sourceId: number | null,
) {
  for (const [i, o] of (q.options ?? []).entries()) {
    await c.query('INSERT INTO options(question_id,label,body,sort_order) VALUES ($1,$2,$3,$4)', [qid, o.label, o.body, i]);
  }
  const keys = [...(q.answer_history ?? []), q.answer];
  for (const [i, k] of keys.entries()) {
    await c.query(`INSERT INTO answer_keys(question_id,version,value,status,source,is_current,note,effective_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [
      qid, i + 1, JSON.stringify(k.value), k.status, k.source, i === keys.length - 1, k.note ?? null, k.effective_at ?? null,
    ]);
  }
  for (const [i, s] of q.solutions.entries()) {
    await c.query(`INSERT INTO solutions(question_id,kind,method_label,body,is_verified,author_name,source_record_id,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [
      qid, s.kind, s.method_label ?? null, s.body, s.is_verified, s.author_name ?? null, sourceId, i,
    ]);
  }
  if (chapter) {
    for (const t of q.topics ?? []) {
      let tid = chapter.topics.get(t);
      if (!tid) {
        tid = (await c.query('INSERT INTO topics(chapter_id,slug,name) VALUES ($1,$2,$3) ON CONFLICT (chapter_id, slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id', [chapter.id, t, titleFromSlug(t)])).rows[0].id as number;
        chapter.topics.set(t, tid);
      }
      await c.query('INSERT INTO question_topics(question_id, topic_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [qid, tid]);
    }
  }
}

/** Safe rollback: archives (never hard-deletes) everything a batch created, preserving student attempts. */
export async function rollbackImport(batchId: number, userId: number | null) {
  return tx(async (c) => {
    const b = (await c.query('SELECT status FROM import_batches WHERE id = $1 FOR UPDATE', [batchId])).rows[0];
    if (!b) throw Object.assign(new Error('Import batch not found'), { status: 404 });
    if (b.status !== 'committed') throw Object.assign(new Error(`Batch is ${b.status}; only committed batches can be rolled back`), { status: 409 });
    const r = await c.query(`UPDATE questions SET status = 'archived', updated_at = now() WHERE import_batch_id = $1 RETURNING id`, [batchId]);
    for (const row of r.rows) await snapshotQuestion(c, row.id, `Archived by rollback of import #${batchId}`, userId);
    await c.query(`UPDATE import_batches SET status = 'rolled_back', rolled_back_at = now() WHERE id = $1`, [batchId]);
    await audit(c, userId, 'import.rollback', 'import_batch', String(batchId), { archived: r.rowCount });
    await refreshStats(c);
    return { archived: r.rowCount ?? 0 };
  });
}
