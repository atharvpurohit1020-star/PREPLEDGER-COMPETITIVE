import { QUESTION_TYPE_LABELS, type QuestionType } from '../../shared/types';
import { pool, type Db } from '../db';

export interface LoadOptions {
  withHistory?: boolean;
  withAnswers?: boolean;
  /** include non-published questions (admin only) */
  includeUnpublished?: boolean;
}

/** Load full question DTOs for the given internal ids, preserving the order of `ids`. */
export async function loadQuestions(ids: number[], opts: LoadOptions = {}, db: Db = pool) {
  if (!ids.length) return [];
  const withAnswers = opts.withAnswers ?? true;
  const base = (
    await db.query(
      `SELECT q.*, e.slug exam_slug, e.name exam_name, ec.slug category_slug, s.slug subject_slug, s.name subject_name,
              c.slug chapter_slug, c.name chapter_name, sr.source_type, sr.title source_title, sr.license source_license,
              sr.permission_note source_permission, ps.public_id passage_public_id, ps.title passage_title, ps.body passage_body
       FROM questions q
       JOIN exams e ON e.id = q.exam_id JOIN exam_categories ec ON ec.id = e.category_id
       JOIN subjects s ON s.id = q.subject_id JOIN chapters c ON c.id = q.chapter_id
       JOIN source_records sr ON sr.id = q.source_record_id
       LEFT JOIN passages ps ON ps.id = q.passage_id
       WHERE q.id = ANY($1) ${opts.includeUnpublished ? '' : "AND q.status = 'published'"}`,
      [ids],
    )
  ).rows;
  const run = async <T,>(fns: (() => Promise<T>)[]) => {
    // A single PoolClient cannot run queries concurrently; the pool can.
    if (db !== pool) {
      const out: T[] = [];
      for (const f of fns) out.push(await f());
      return out;
    }
    return Promise.all(fns.map((f) => f()));
  };
  const [options, keys, sols, diags, papers, topics, tags] = await run<{ rows: any[] }>([
    () => db.query('SELECT question_id, label, body FROM options WHERE question_id = ANY($1) ORDER BY sort_order, label', [ids]),
    () => withAnswers
      ? db.query(`SELECT question_id, version, value, status, source, is_current, note, effective_at, created_at FROM answer_keys WHERE question_id = ANY($1) ${opts.withHistory ? '' : 'AND is_current'} ORDER BY version`, [ids])
      : Promise.resolve({ rows: [] as any[] }),
    () => withAnswers
      ? db.query('SELECT id, question_id, kind, method_label, body, is_verified, author_name FROM solutions WHERE question_id = ANY($1) ORDER BY sort_order, id', [ids])
      : Promise.resolve({ rows: [] as any[] }),
    () => db.query('SELECT qd.question_id, d.public_id, d.url, d.alt_text, d.caption, d.width, d.height FROM question_diagrams qd JOIN diagram_assets d ON d.id = qd.diagram_id WHERE qd.question_id = ANY($1)', [ids]),
    () => db.query(
      `SELECT pq.question_id, pq.question_number, pq.section_key, p.public_id, p.slug, p.title, p.year, p.kind, p.exam_date, p.shift
       FROM paper_questions pq JOIN papers p ON p.id = pq.paper_id WHERE pq.question_id = ANY($1) AND p.status = 'published' ORDER BY p.year DESC NULLS LAST`,
      [ids],
    ),
    () => db.query('SELECT qt.question_id, t.slug, t.name FROM question_topics qt JOIN topics t ON t.id = qt.topic_id WHERE qt.question_id = ANY($1)', [ids]),
    () => db.query('SELECT qt.question_id, c.slug, c.name FROM question_chapter_tags qt JOIN chapters c ON c.id = qt.chapter_id WHERE qt.question_id = ANY($1)', [ids]),
  ]);
  const group = <T extends { question_id: number }>(rows: T[]) => {
    const m = new Map<number, T[]>();
    for (const r of rows) {
      if (!m.has(r.question_id)) m.set(r.question_id, []);
      m.get(r.question_id)!.push(r);
    }
    return m;
  };
  const go = group(options.rows), gk = group(keys.rows), gs = group(sols.rows), gd = group(diags.rows), gp = group(papers.rows), gt = group(topics.rows), gc = group(tags.rows);
  const byId = new Map(base.map((q) => [q.id, q]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((q: any) => {
      const k = gk.get(q.id) ?? [];
      return {
        id: q.id,
        public_id: q.public_id,
        type: q.type as QuestionType,
        type_label: QUESTION_TYPE_LABELS[q.type as QuestionType],
        body: q.body,
        matrix: q.matrix,
        marks: q.marks,
        negative_marks: q.negative_marks,
        difficulty: q.difficulty,
        is_pyq: q.is_pyq,
        status: q.status,
        verification_status: q.verification_status,
        updated_at: q.updated_at,
        exam: { slug: q.exam_slug, name: q.exam_name, category: q.category_slug },
        subject: { slug: q.subject_slug, name: q.subject_name },
        chapter: { slug: q.chapter_slug, name: q.chapter_name },
        also_chapters: (gc.get(q.id) ?? []).map(({ slug, name }) => ({ slug, name })),
        topics: (gt.get(q.id) ?? []).map(({ slug, name }) => ({ slug, name })),
        passage: q.passage_public_id ? { public_id: q.passage_public_id, title: q.passage_title, body: q.passage_body } : null,
        options: (go.get(q.id) ?? []).map(({ label, body }) => ({ label, body })),
        answer: withAnswers ? (k.find((x) => x.is_current) ?? null) && strip(k.find((x) => x.is_current)) : undefined,
        answer_history: opts.withHistory ? k.map(strip) : undefined,
        solutions: withAnswers ? (gs.get(q.id) ?? []).map(({ question_id: _q, ...s }) => s) : undefined,
        diagrams: Object.fromEntries((gd.get(q.id) ?? []).map(({ question_id: _q, ...d }) => [d.public_id, d])),
        papers: (gp.get(q.id) ?? []).map(({ question_id: _q, ...p }) => p),
        source: { type: q.source_type, title: q.source_title, license: q.source_license, permission: q.source_permission, ref: q.source_ref },
      };
    });
}

function strip(k: any) {
  if (!k) return null;
  const { question_id: _q, ...rest } = k;
  return rest;
}

export type QuestionDTO = Awaited<ReturnType<typeof loadQuestions>>[number];

/** Store a full snapshot of the question (incl. children) as a new revision. */
export async function snapshotQuestion(db: Db, qid: number, note: string, userId: number | null) {
  const [q] = await loadQuestions([qid], { withHistory: true, includeUnpublished: true }, db);
  if (!q) return;
  const next = (await db.query('SELECT COALESCE(max(revision),0)+1 n FROM question_revisions WHERE question_id = $1', [qid])).rows[0].n;
  const raw = (await db.query('SELECT chapter_id, subject_id, exam_id, passage_id FROM questions WHERE id = $1', [qid])).rows[0];
  await db.query('INSERT INTO question_revisions(question_id, revision, snapshot, change_note, created_by) VALUES ($1,$2,$3,$4,$5)', [
    qid, next, { ...q, _ids: raw }, note, userId,
  ]);
}
