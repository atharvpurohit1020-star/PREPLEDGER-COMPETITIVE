import { Router, type Request } from 'express';
import { z } from 'zod';
import { computeChapterStats, type StatRecord } from '../../shared/stats';
import { QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from '../../shared/types';
import { one, pool } from '../db';
import { loadQuestions } from '../lib/questions';
import { HttpError, wrap } from '../lib/http';

export const publicRouter = Router();
const PAGE_SIZE = 20;

async function examBySlug(slug: string) {
  const e = await one(
    `SELECT e.*, ec.slug category_slug, ec.name category_name FROM exams e JOIN exam_categories ec ON ec.id = e.category_id WHERE e.slug = $1`,
    [slug],
  );
  if (!e) throw new HttpError(404, `Exam "${slug}" not found`);
  return e;
}

async function subjectBySlug(examId: number, slug: string) {
  const s = await one('SELECT * FROM subjects WHERE exam_id = $1 AND slug = $2', [examId, slug]);
  if (!s) throw new HttpError(404, `Subject "${slug}" not found`);
  return s;
}

const examSummary = (e: any) => ({
  slug: e.slug, name: e.name, short_name: e.short_name, full_name: e.full_name, conducting_body: e.conducting_body,
  region: e.region, description: e.description, on_reference: e.on_reference,
  category: { slug: e.category_slug, name: e.category_name },
  marking_scheme: e.marking_scheme, marking_scheme_note: e.marking_scheme_note, marking_scheme_verified: e.marking_scheme_verified,
});

// ---------------------------------------------------------------- exams
publicRouter.get('/exams', wrap(async () => {
  const rows = (
    await pool.query(`
      SELECT e.slug, e.name, e.short_name, e.region, e.on_reference, ec.slug category_slug, ec.name category_name, ec.sort_order cs, e.sort_order es,
        (SELECT count(*) FROM questions q WHERE q.exam_id = e.id AND q.status='published') question_count,
        (SELECT count(*) FROM questions q WHERE q.exam_id = e.id AND q.status='published' AND q.is_pyq) pyq_count,
        (SELECT count(*) FROM papers p WHERE p.exam_id = e.id AND p.status='published' AND p.kind='past_paper') past_paper_count,
        (SELECT count(*) FROM papers p WHERE p.exam_id = e.id AND p.status='published' AND p.kind='sample') sample_paper_count
      FROM exams e JOIN exam_categories ec ON ec.id = e.category_id ORDER BY ec.sort_order, e.sort_order`)
  ).rows;
  const cats: any[] = [];
  for (const r of rows) {
    let c = cats.find((x) => x.slug === r.category_slug);
    if (!c) cats.push((c = { slug: r.category_slug, name: r.category_name, exams: [] }));
    c.exams.push({ slug: r.slug, name: r.name, short_name: r.short_name, region: r.region, on_reference: r.on_reference, question_count: r.question_count, pyq_count: r.pyq_count, past_paper_count: r.past_paper_count, sample_paper_count: r.sample_paper_count });
  }
  return { categories: cats };
}));

async function chapterRows(subjectId: number, syllabusExamId: number) {
  return (
    await pool.query(
      `SELECT c.id, c.slug, c.name, c.unit_name, c.sort_order, cs.question_count, cs.pyq_count, cs.paper_count, cs.first_year, cs.last_year,
              (SELECT json_agg(json_build_object('status', x.status, 'note', x.note, 'version', sv.label, 'verified', sv.is_verified))
                 FROM chapter_syllabus x JOIN syllabus_versions sv ON sv.id = x.syllabus_version_id
                 WHERE x.chapter_id = c.id AND sv.exam_id = $2) syllabus
       FROM chapters c JOIN chapter_statistics cs ON cs.chapter_id = c.id
       WHERE c.subject_id = $1 ORDER BY c.sort_order`,
      [subjectId, syllabusExamId],
    )
  ).rows;
}

function groupUnits(chapters: any[]) {
  const units: { name: string; chapters: any[] }[] = [];
  for (const c of chapters) {
    const name = c.unit_name ?? 'Chapters';
    let u = units.find((x) => x.name === name);
    if (!u) units.push((u = { name, chapters: [] }));
    u.chapters.push(c);
  }
  return units;
}

publicRouter.get('/exams/:exam', wrap(async (req) => {
  const e = await examBySlug(req.params.exam);
  const subjects = (await pool.query('SELECT * FROM subjects WHERE exam_id = $1 ORDER BY sort_order', [e.id])).rows;
  const out = [];
  for (const s of subjects) {
    const chapters = await chapterRows(s.id, e.id);
    out.push({
      slug: s.slug, name: s.name,
      question_count: chapters.reduce((a, c) => a + c.question_count, 0),
      chapter_count: chapters.length,
      chapters_with_questions: chapters.filter((c) => c.question_count > 0).length,
      units: groupUnits(chapters.map(({ id: _i, ...c }) => c)),
    });
  }
  const papers = (
    await pool.query(
      `SELECT p.public_id, p.slug, p.title, p.kind, p.year, p.availability,
              (SELECT count(*) FROM paper_questions pq JOIN questions q ON q.id = pq.question_id WHERE pq.paper_id = p.id AND q.status='published') question_count
       FROM papers p WHERE p.exam_id = $1 AND p.status = 'published' ORDER BY p.kind, p.year DESC NULLS LAST, p.exam_date DESC NULLS LAST`,
      [e.id],
    )
  ).rows;
  const syllabus = (await pool.query('SELECT label, effective_from_year, is_verified, notes FROM syllabus_versions WHERE exam_id = $1', [e.id])).rows;
  const years = [...new Set(papers.filter((p) => p.kind === 'past_paper' && p.year).map((p) => p.year))].sort((a, b) => b - a);
  return {
    exam: examSummary(e),
    subjects: out,
    syllabus_versions: syllabus,
    papers: {
      years,
      past_paper_count: papers.filter((p) => p.kind === 'past_paper').length,
      past_papers_with_questions: papers.filter((p) => p.kind === 'past_paper' && p.question_count > 0).length,
      samples: papers.filter((p) => p.kind === 'sample'),
    },
    totals: {
      questions: out.reduce((a, s) => a + s.question_count, 0),
      pyq: Number((await one('SELECT count(*) n FROM questions WHERE exam_id = $1 AND status = $2 AND is_pyq', [e.id, 'published']))!.n),
    },
  };
}));

publicRouter.get('/exams/:exam/subjects/:subject', wrap(async (req) => {
  const e = await examBySlug(req.params.exam);
  const s = await subjectBySlug(e.id, req.params.subject);
  const chapters = await chapterRows(s.id, e.id);
  const total = chapters.reduce((a, c) => a + c.question_count, 0);
  const subjects = (await pool.query('SELECT slug, name FROM subjects WHERE exam_id = $1 ORDER BY sort_order', [e.id])).rows;
  return {
    exam: examSummary(e),
    subject: { slug: s.slug, name: s.name, question_count: total },
    subjects,
    units: groupUnits(chapters.map(({ id: _i, ...c }) => ({ ...c, weightage: total > 0 ? c.question_count / total : null }))),
  };
}));

// ---------------------------------------------------------------- chapter
const chapterQuery = z.object({
  type: z.enum(QUESTION_TYPES).optional(),
  year: z.coerce.number().int().optional(),
  topic: z.string().max(120).optional(),
  source: z.enum(['pyq', 'sample']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(['default', 'year_desc', 'year_asc']).default('default'),
  all: z.enum(['1']).optional(), // print/PDF export: every matching question on one page (capped)
});

publicRouter.get('/exams/:exam/subjects/:subject/chapters/:chapter', wrap(async (req) => {
  const e = await examBySlug(req.params.exam);
  const s = await subjectBySlug(e.id, req.params.subject);
  const c = await one('SELECT * FROM chapters WHERE subject_id = $1 AND slug = $2', [s.id, req.params.chapter]);
  if (!c) throw new HttpError(404, `Chapter "${req.params.chapter}" not found`);
  const f = parseQuery(chapterQuery, req);

  // every published question in the chapter (primary or tagged), with paper links — for stats and filtering
  const recs = (
    await pool.query(
      `SELECT q.id, q.type, q.is_pyq, q.created_at,
              COALESCE(json_agg(json_build_object('paperId', p.id, 'year', p.year, 'kind', p.kind, 'date', p.exam_date)) FILTER (WHERE p.id IS NOT NULL), '[]') papers,
              ARRAY(SELECT t.slug FROM question_topics qt JOIN topics t ON t.id = qt.topic_id WHERE qt.question_id = q.id) topics
       FROM questions q
       LEFT JOIN paper_questions pq ON pq.question_id = q.id
       LEFT JOIN papers p ON p.id = pq.paper_id AND p.status = 'published'
       WHERE q.status = 'published' AND (q.chapter_id = $1 OR q.id IN (SELECT question_id FROM question_chapter_tags WHERE chapter_id = $1))
       GROUP BY q.id ORDER BY q.id`,
      [c.id],
    )
  ).rows;
  const subjectTotal = Number((await one(`SELECT count(*) n FROM questions WHERE subject_id = $1 AND status = 'published'`, [s.id]))!.n);
  const statRecords: StatRecord[] = recs.map((r) => ({ questionId: r.id, type: r.type, isPyq: r.is_pyq, papers: r.papers }));
  const stats = computeChapterStats(statRecords, subjectTotal);

  const latestYear = (r: any) => Math.max(-1, ...r.papers.filter((p: any) => p.kind === 'past_paper' && p.year).map((p: any) => p.year));
  let filtered = recs.filter(
    (r) =>
      (!f.type || r.type === f.type) &&
      (!f.year || r.papers.some((p: any) => p.year === f.year && p.kind === 'past_paper')) &&
      (!f.topic || r.topics.includes(f.topic)) &&
      (!f.source || (f.source === 'pyq' ? r.is_pyq : !r.is_pyq)),
  );
  if (f.sort === 'year_desc') filtered = [...filtered].sort((a, b) => latestYear(b) - latestYear(a) || a.id - b.id);
  if (f.sort === 'year_asc') filtered = [...filtered].sort((a, b) => latestYear(a) - latestYear(b) || a.id - b.id);
  const size = f.all ? 500 : PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  if (f.page > pages && filtered.length) throw new HttpError(404, `Page ${f.page} does not exist (last page is ${pages})`);
  const pageIds = filtered.slice((f.page - 1) * size, f.page * size).map((r) => r.id);
  const questions = await loadQuestions(pageIds, { withHistory: true });

  const topics = (await pool.query('SELECT slug, name FROM topics WHERE chapter_id = $1 ORDER BY sort_order, name', [c.id])).rows.map((t) => ({
    ...t, count: recs.filter((r) => r.topics.includes(t.slug)).length,
  }));
  const siblings = (
    await pool.query(
      `SELECT c.slug, c.name, c.unit_name, cs.question_count FROM chapters c JOIN chapter_statistics cs ON cs.chapter_id = c.id WHERE c.subject_id = $1 ORDER BY c.sort_order`,
      [s.id],
    )
  ).rows;
  const idx = siblings.findIndex((x) => x.slug === c.slug);
  const syllabus = (
    await pool.query(
      `SELECT x.status, x.note, sv.label version, sv.is_verified verified FROM chapter_syllabus x JOIN syllabus_versions sv ON sv.id = x.syllabus_version_id WHERE x.chapter_id = $1`,
      [c.id],
    )
  ).rows;
  const subjects = (await pool.query('SELECT slug, name FROM subjects WHERE exam_id = $1 ORDER BY sort_order', [e.id])).rows;
  return {
    exam: examSummary(e),
    subject: { slug: s.slug, name: s.name },
    subjects,
    chapter: { slug: c.slug, name: c.name, unit_name: c.unit_name, syllabus },
    siblings,
    prev_chapter: idx > 0 ? siblings[idx - 1] : null,
    next_chapter: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
    stats: { ...stats, subject_total: subjectTotal, type_labels: QUESTION_TYPE_LABELS },
    facets: {
      types: Object.entries(stats.byType).map(([type, count]) => ({ type, label: QUESTION_TYPE_LABELS[type as QuestionType], count })),
      years: stats.byYear,
      topics,
      sources: { pyq: stats.pyqCount, sample: stats.sampleCount },
    },
    filters: f,
    total: filtered.length,
    page: f.page,
    pages,
    page_size: size,
    questions,
  };
}));

// ---------------------------------------------------------------- papers
publicRouter.get('/exams/:exam/papers', wrap(async (req) => {
  const e = await examBySlug(req.params.exam);
  const rows = (
    await pool.query(
      `SELECT p.public_id, p.slug, p.title, p.kind, p.year, p.session, p.exam_date, p.shift, p.paper_number, p.duration_minutes, p.total_marks,
              p.availability, p.verification_status, p.notes,
              (SELECT count(*) FROM paper_questions pq JOIN questions q ON q.id = pq.question_id WHERE pq.paper_id = p.id AND q.status='published') question_count
       FROM papers p WHERE p.exam_id = $1 AND p.status = 'published'
       ORDER BY p.year DESC NULLS LAST, p.exam_date DESC NULLS LAST, p.paper_number NULLS LAST, p.shift DESC NULLS LAST, p.title`,
      [e.id],
    )
  ).rows;
  const groups: { year: number | null; label: string; papers: any[] }[] = [];
  for (const p of rows.filter((r) => r.kind === 'past_paper')) {
    let g = groups.find((x) => x.year === p.year);
    if (!g) groups.push((g = { year: p.year, label: String(p.year), papers: [] }));
    g.papers.push(p);
  }
  return { exam: examSummary(e), years: groups, samples: rows.filter((r) => r.kind === 'sample') };
}));

export async function paperDetail(publicId: string, opts: { withAnswers: boolean }) {
  const p = await one(
    `SELECT p.*, e.slug exam_slug, e.name exam_name, e.marking_scheme exam_scheme, e.marking_scheme_note, ec.slug category_slug, sr.title source_title, sr.source_type, sr.license
     FROM papers p JOIN exams e ON e.id = p.exam_id JOIN exam_categories ec ON ec.id = e.category_id LEFT JOIN source_records sr ON sr.id = p.source_record_id
     WHERE p.public_id = $1 AND p.status = 'published'`,
    [publicId],
  );
  if (!p) throw new HttpError(404, 'Paper not found');
  const links = (
    await pool.query(
      `SELECT pq.question_id, pq.question_number, pq.section_key, pq.marks, pq.negative_marks FROM paper_questions pq JOIN questions q ON q.id = pq.question_id
       WHERE pq.paper_id = $1 AND q.status = 'published' ORDER BY pq.question_number`,
      [p.id],
    )
  ).rows;
  const qs = await loadQuestions(links.map((l) => l.question_id), { withAnswers: opts.withAnswers, withHistory: opts.withAnswers });
  const byId = new Map(qs.map((q) => [q.id, q]));
  const items = links.filter((l) => byId.has(l.question_id)).map((l) => ({ number: l.question_number, section: l.section_key, marks: l.marks, negative_marks: l.negative_marks, question: byId.get(l.question_id)! }));
  const scheme = p.marking_scheme ?? p.exam_scheme;
  return {
    paper: {
      public_id: p.public_id, slug: p.slug, title: p.title, kind: p.kind, year: p.year, session: p.session, exam_date: p.exam_date, shift: p.shift,
      paper_number: p.paper_number, language: p.language, duration_minutes: p.duration_minutes, total_marks: p.total_marks, availability: p.availability,
      verification_status: p.verification_status, notes: p.notes, sections: p.sections, marking_scheme: scheme,
      marking_scheme_note: p.marking_scheme ? null : p.marking_scheme_note,
      source: { title: p.source_title, type: p.source_type, license: p.license },
    },
    exam: { slug: p.exam_slug, name: p.exam_name, category: p.category_slug },
    items,
  };
}

publicRouter.get('/papers/:publicId', wrap(async (req) => paperDetail(req.params.publicId, { withAnswers: true })));

// ---------------------------------------------------------------- question detail
const questionQuery = z.object({ ctx: z.enum(['chapter', 'paper']).optional(), paper: z.string().max(20).optional() });

publicRouter.get('/questions/:publicId', wrap(async (req) => {
  const row = await one(`SELECT id, chapter_id FROM questions WHERE public_id = $1 AND status = 'published'`, [req.params.publicId]);
  if (!row) throw new HttpError(404, 'Question not found');
  const f = parseQuery(questionQuery, req);
  const [q] = await loadQuestions([row.id], { withHistory: true });
  let context: any = null;
  const paperRef = f.paper ?? (f.ctx === 'paper' ? q.papers[0]?.public_id : undefined);
  if (f.ctx === 'paper' && paperRef) {
    const p = await one(`SELECT id, public_id, slug, title FROM papers WHERE public_id = $1 AND status = 'published'`, [paperRef]);
    if (p) {
      const list = (
        await pool.query(
          `SELECT q.public_id, pq.question_number FROM paper_questions pq JOIN questions q ON q.id = pq.question_id WHERE pq.paper_id = $1 AND q.status='published' ORDER BY pq.question_number`,
          [p.id],
        )
      ).rows;
      const i = list.findIndex((x) => x.public_id === q.public_id);
      if (i >= 0) context = { kind: 'paper', paper: { public_id: p.public_id, slug: p.slug, title: p.title }, position: i + 1, total: list.length, number: list[i].question_number, prev: list[i - 1]?.public_id ?? null, next: list[i + 1]?.public_id ?? null };
    }
  }
  if (!context) {
    const list = (await pool.query(`SELECT public_id FROM questions WHERE chapter_id = $1 AND status = 'published' ORDER BY id`, [row.chapter_id])).rows.map((r) => r.public_id);
    const i = list.indexOf(q.public_id);
    context = { kind: 'chapter', position: i + 1, total: list.length, prev: list[i - 1] ?? null, next: list[i + 1] ?? null };
  }
  const reports = Number((await one(`SELECT count(*) n FROM content_reports WHERE question_id = $1 AND status = 'open'`, [row.id]))!.n);
  return { question: q, context, open_reports: reports };
}));

// ---------------------------------------------------------------- search
const searchQuery = z.object({
  q: z.string().trim().max(200).default(''),
  exam: z.string().max(60).optional(),
  subject: z.string().max(60).optional(),
  chapter: z.string().max(120).optional(),
  type: z.enum(QUESTION_TYPES).optional(),
  year: z.coerce.number().int().optional(),
  source: z.enum(['pyq', 'sample']).optional(),
  sort: z.enum(['relevance', 'year_desc', 'year_asc', 'newest']).default('relevance'),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

publicRouter.get('/search', wrap(async (req) => {
  const f = parseQuery(searchQuery, req);
  // Each clause is a builder so every query (results and each facet) binds exactly the params it uses.
  type Clause = (p: (v: unknown) => string) => string;
  const clauses: Record<string, Clause> = { base: () => `q.status = 'published'` };
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, (m) => '\\' + m)}%`;
    clauses.q = (p) => {
      const t = p(f.q);
      const l = p(like);
      return `(q.search_vec @@ websearch_to_tsquery('simple', ${t}) OR q.search_text ILIKE ${l} OR c.name ILIKE ${l} OR s.name ILIKE ${l} OR e.name ILIKE ${l} OR q.public_id = ${t})`;
    };
  }
  if (f.exam) clauses.exam = (p) => `e.slug = ${p(f.exam)}`;
  if (f.subject) clauses.subject = (p) => `s.slug = ${p(f.subject)}`;
  if (f.chapter) clauses.chapter = (p) => `c.slug = ${p(f.chapter)}`;
  if (f.type) clauses.type = (p) => `q.type = ${p(f.type)}`;
  if (f.source) clauses.source = () => (f.source === 'pyq' ? 'q.is_pyq' : 'NOT q.is_pyq');
  if (f.year) clauses.year = (p) => `EXISTS (SELECT 1 FROM paper_questions pq JOIN papers pp ON pp.id = pq.paper_id WHERE pq.question_id = q.id AND pp.kind = 'past_paper' AND pp.year = ${p(f.year)})`;
  const build = (except?: string) => {
    const params: unknown[] = [];
    const p = (v: unknown) => (params.push(v), `$${params.length}`);
    const sql = 'WHERE ' + Object.entries(clauses).filter(([k]) => k !== except).map(([, c]) => c(p)).join(' AND ');
    return { sql, params };
  };
  const from = `FROM questions q JOIN exams e ON e.id = q.exam_id JOIN subjects s ON s.id = q.subject_id JOIN chapters c ON c.id = q.chapter_id`;
  const yearExpr = `(SELECT max(pp.year) FROM paper_questions pq JOIN papers pp ON pp.id = pq.paper_id WHERE pq.question_id = q.id AND pp.kind = 'past_paper')`;
  // without search text, "relevance" falls back to the taxonomy order (exam → subject → chapter); $1 is always the text when present
  const relevance = f.q
    ? `ts_rank(q.search_vec, websearch_to_tsquery('simple', $1)) + similarity(q.search_text, $1) DESC, q.id`
    : `e.sort_order, s.sort_order, c.sort_order, q.id`;
  const order = {
    relevance,
    year_desc: `${yearExpr} DESC NULLS LAST, q.id`,
    year_asc: `${yearExpr} ASC NULLS LAST, q.id`,
    newest: `q.created_at DESC, q.id DESC`,
  }[f.sort];

  const all = build();
  const total = Number((await pool.query(`SELECT count(*) n ${from} ${all.sql}`, all.params)).rows[0].n);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const ids = (await pool.query(`SELECT q.id ${from} ${all.sql} ORDER BY ${order} LIMIT ${PAGE_SIZE} OFFSET ${(f.page - 1) * PAGE_SIZE}`, all.params)).rows.map((r) => r.id);
  const results = await loadQuestions(ids, { withHistory: true });

  const facet = async (key: string, sql: string) => {
    const w = build(key);
    return (await pool.query(sql.replace('%W', w.sql), w.params)).rows;
  };
  const [exams, subjects, chapters, types, years, sources] = [
    await facet('exam', `SELECT e.slug value, e.name label, count(*)::int count ${from} %W GROUP BY e.slug, e.name, e.sort_order ORDER BY e.sort_order`),
    f.exam ? await facet('subject', `SELECT s.slug value, s.name label, count(*)::int count ${from} %W GROUP BY s.slug, s.name, s.sort_order ORDER BY s.sort_order`) : [],
    f.exam && f.subject ? await facet('chapter', `SELECT c.slug value, c.name label, count(*)::int count ${from} %W GROUP BY c.slug, c.name, c.sort_order ORDER BY c.sort_order`) : [],
    await facet('type', `SELECT q.type value, count(*)::int count ${from} %W GROUP BY q.type ORDER BY q.type`),
    await facet('year', `SELECT pp.year value, count(DISTINCT q.id)::int count ${from} JOIN paper_questions pq ON pq.question_id = q.id JOIN papers pp ON pp.id = pq.paper_id AND pp.kind = 'past_paper' %W GROUP BY pp.year ORDER BY pp.year DESC`),
    await facet('source', `SELECT CASE WHEN q.is_pyq THEN 'pyq' ELSE 'sample' END value, count(*)::int count ${from} %W GROUP BY 1`),
  ];
  // navigational matches: chapters whose names match the query
  const chapterHits = f.q
    ? (
        await pool.query(
          `SELECT e.slug exam, e.name exam_name, ec.slug category, s.slug subject, s.name subject_name, c.slug, c.name, cs.question_count
           FROM chapters c JOIN subjects s ON s.id = c.subject_id JOIN exams e ON e.id = s.exam_id JOIN exam_categories ec ON ec.id = e.category_id
           JOIN chapter_statistics cs ON cs.chapter_id = c.id
           WHERE c.name ILIKE $1 ${f.exam ? 'AND e.slug = $2' : ''} ORDER BY cs.question_count DESC, e.sort_order LIMIT 12`,
          f.exam ? [`%${f.q}%`, f.exam] : [`%${f.q}%`],
        )
      ).rows
    : [];
  return {
    filters: f,
    total,
    page: f.page,
    pages,
    page_size: PAGE_SIZE,
    results,
    chapter_hits: chapterHits,
    facets: { exams, subjects, chapters, types: types.map((t: any) => ({ ...t, label: QUESTION_TYPE_LABELS[t.value as QuestionType] })), years, sources },
  };
}));

// ---------------------------------------------------------------- coverage
publicRouter.get('/coverage', wrap(async () => {
  const exams = (
    await pool.query(`
      SELECT e.slug, e.name, e.on_reference,
        (SELECT count(*) FROM chapters c JOIN subjects s ON s.id = c.subject_id WHERE s.exam_id = e.id) chapters,
        (SELECT count(*) FROM chapters c JOIN subjects s ON s.id = c.subject_id JOIN chapter_statistics cs ON cs.chapter_id = c.id WHERE s.exam_id = e.id AND cs.question_count > 0) chapters_with_questions,
        (SELECT count(*) FROM questions q WHERE q.exam_id = e.id AND q.status = 'published') published,
        (SELECT count(*) FROM questions q WHERE q.exam_id = e.id AND q.status = 'published' AND q.is_pyq) pyq,
        (SELECT count(*) FROM questions q WHERE q.exam_id = e.id AND q.status = 'published' AND q.verification_status = 'verified') verified,
        (SELECT count(*) FROM questions q WHERE q.exam_id = e.id AND q.status IN ('draft','in_review')) unpublished,
        (SELECT count(*) FROM papers p WHERE p.exam_id = e.id AND p.kind = 'past_paper' AND p.status='published') past_papers,
        (SELECT count(*) FROM papers p WHERE p.exam_id = e.id AND p.kind = 'past_paper' AND p.status='published' AND p.availability = 'full') past_papers_full,
        (SELECT count(*) FROM papers p WHERE p.exam_id = e.id AND p.kind = 'past_paper' AND p.status='published' AND p.availability = 'partial') past_papers_partial,
        (SELECT count(*) FROM papers p WHERE p.exam_id = e.id AND p.kind = 'sample' AND p.status='published') sample_papers
      FROM exams e ORDER BY e.sort_order`)
  ).rows;
  const subjects = (
    await pool.query(`
      SELECT e.slug exam, s.slug, s.name, count(c.id) chapters, count(c.id) FILTER (WHERE cs.question_count > 0) chapters_with_questions, COALESCE(sum(cs.question_count),0) questions, COALESCE(sum(cs.pyq_count),0) pyq
      FROM subjects s JOIN exams e ON e.id = s.exam_id JOIN chapters c ON c.subject_id = s.id JOIN chapter_statistics cs ON cs.chapter_id = c.id
      GROUP BY e.slug, e.sort_order, s.slug, s.name, s.sort_order ORDER BY e.sort_order, s.sort_order`)
  ).rows;
  const papers = (
    await pool.query(`
      SELECT e.slug exam, p.year, p.public_id, p.title, p.kind, p.availability, p.verification_status,
             (SELECT count(*) FROM paper_questions pq JOIN questions q ON q.id = pq.question_id WHERE pq.paper_id = p.id AND q.status='published') questions
      FROM papers p JOIN exams e ON e.id = p.exam_id WHERE p.status = 'published' ORDER BY e.sort_order, p.year DESC NULLS LAST, p.exam_date DESC NULLS LAST`)
  ).rows;
  const sources = (
    await pool.query(`SELECT sr.source_type, sr.title, sr.license, count(q.id) FILTER (WHERE q.status = 'published') questions FROM source_records sr LEFT JOIN questions q ON q.source_record_id = sr.id GROUP BY sr.id ORDER BY sr.id`)
  ).rows;
  const types = (await pool.query(`SELECT type, count(*) n FROM questions WHERE status = 'published' GROUP BY type ORDER BY type`)).rows;
  return { generated_at: new Date().toISOString(), exams, subjects, papers, sources, types };
}));

// ---------------------------------------------------------------- helpers
export function parseQuery<T extends z.ZodTypeAny>(schema: T, req: Request): z.infer<T> {
  const r = schema.safeParse(req.query);
  if (!r.success) throw new HttpError(400, 'Invalid query: ' + r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '));
  return r.data;
}
