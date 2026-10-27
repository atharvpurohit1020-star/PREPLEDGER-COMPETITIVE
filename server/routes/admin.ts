import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { diagramRefs, renderContent } from '../../shared/content';
import { answerKeySchema, sourceSchema } from '../../shared/importSchema';
import { QUESTION_TYPES } from '../../shared/types';
import { one, pool, refreshStats, tx } from '../db';
import { audit } from '../lib/audit';
import { requireRole } from '../lib/auth';
import { body, HttpError, wrap } from '../lib/http';
import { contentHash, randomPublicId, searchTextFor, slugify } from '../lib/ids';
import { commitImport, parseUpload, rollbackImport, validateImport } from '../lib/importer';
import { loadQuestions, snapshotQuestion } from '../lib/questions';
import { parseQuery } from './public';

export const adminRouter = Router();
adminRouter.use(requireRole('editor', 'admin'));

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const uid = (req: any) => req.user!.id as number;

// ---------------------------------------------------------------- dashboard
adminRouter.get('/summary', wrap(async () => {
  const c = (await pool.query(`
    SELECT (SELECT count(*) FROM questions) questions,
           (SELECT count(*) FROM questions WHERE status='published') published,
           (SELECT count(*) FROM questions WHERE status IN ('draft','in_review')) unpublished,
           (SELECT count(*) FROM questions WHERE verification_status='needs_correction') needs_correction,
           (SELECT count(*) FROM questions WHERE verification_status='verified') verified,
           (SELECT count(*) FROM content_reports WHERE status='open') open_reports,
           (SELECT count(*) FROM papers) papers,
           (SELECT count(*) FROM import_batches) imports,
           (SELECT count(*) FROM users) users`)).rows[0];
  const recent = (await pool.query(`SELECT a.action, a.entity_type, a.entity_id, a.created_at, u.email actor FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 15`)).rows;
  return { counts: c, recent };
}));

// ---------------------------------------------------------------- taxonomy
adminRouter.get('/taxonomy', wrap(async () => {
  const exams = (await pool.query(`SELECT e.id, e.slug, e.name, e.short_name, e.description, e.marking_scheme, e.marking_scheme_note, e.marking_scheme_verified, ec.slug category FROM exams e JOIN exam_categories ec ON ec.id = e.category_id ORDER BY ec.sort_order, e.sort_order`)).rows;
  const subjects = (await pool.query('SELECT id, exam_id, slug, name, sort_order FROM subjects ORDER BY sort_order')).rows;
  const chapters = (await pool.query('SELECT c.id, c.subject_id, c.slug, c.name, c.unit_name, c.sort_order, cs.question_count FROM chapters c JOIN chapter_statistics cs ON cs.chapter_id = c.id ORDER BY c.sort_order')).rows;
  const topics = (await pool.query('SELECT id, chapter_id, slug, name FROM topics ORDER BY sort_order, name')).rows;
  const syllabus = (await pool.query('SELECT sv.*, (SELECT json_agg(json_build_object(\'chapter_id\', chapter_id, \'status\', status, \'note\', note)) FROM chapter_syllabus WHERE syllabus_version_id = sv.id) mappings FROM syllabus_versions sv')).rows;
  const categories = (await pool.query('SELECT slug, name FROM exam_categories ORDER BY sort_order')).rows;
  return { categories, exams, subjects, chapters, topics, syllabus };
}));

adminRouter.post('/exams', wrap(async (req) => {
  const b = body(z.object({ category: slug, slug, name: z.string().min(2).max(120), short_name: z.string().min(2).max(60), description: z.string().max(2000).optional() }), req);
  const cat = await one('SELECT id FROM exam_categories WHERE slug = $1', [b.category]);
  if (!cat) throw new HttpError(400, 'Unknown category');
  if (await one('SELECT 1 FROM exams WHERE slug = $1', [b.slug])) throw new HttpError(409, 'Exam slug already exists');
  const e = await one(`INSERT INTO exams(category_id,slug,name,short_name,description,on_reference,sort_order) VALUES ($1,$2,$3,$4,$5,false,(SELECT COALESCE(max(sort_order),0)+1 FROM exams)) RETURNING id, slug`, [cat.id, b.slug, b.name, b.short_name, b.description ?? null]);
  await audit(pool, uid(req), 'exam.create', 'exam', b.slug);
  return e;
}));

const markingRule = z.object({ correct: z.number(), wrong: z.number(), unattempted: z.number().optional(), partial: z.enum(['none', 'per_option']).optional() });
adminRouter.patch('/exams/:slug', wrap(async (req) => {
  const b = body(z.object({
    name: z.string().min(2).max(120).optional(), description: z.string().max(2000).optional(),
    marking_scheme: z.record(z.enum([...QUESTION_TYPES, 'note'] as [string, ...string[]]), markingRule.or(z.string())).optional(),
    marking_scheme_note: z.string().max(1000).optional(), marking_scheme_verified: z.boolean().optional(),
  }), req);
  const e = await one(
    `UPDATE exams SET name = COALESCE($2,name), description = COALESCE($3,description), marking_scheme = COALESCE($4,marking_scheme),
       marking_scheme_note = COALESCE($5,marking_scheme_note), marking_scheme_verified = COALESCE($6,marking_scheme_verified), updated_at = now() WHERE slug = $1 RETURNING slug`,
    [req.params.slug, b.name ?? null, b.description ?? null, b.marking_scheme ?? null, b.marking_scheme_note ?? null, b.marking_scheme_verified ?? null],
  );
  if (!e) throw new HttpError(404, 'Exam not found');
  await audit(pool, uid(req), 'exam.update', 'exam', req.params.slug, b);
  return e;
}));

adminRouter.post('/exams/:slug/subjects', wrap(async (req) => {
  const b = body(z.object({ slug, name: z.string().min(2).max(120) }), req);
  const e = await one('SELECT id FROM exams WHERE slug = $1', [req.params.slug]);
  if (!e) throw new HttpError(404, 'Exam not found');
  const s = await one('INSERT INTO subjects(exam_id,slug,name,sort_order) VALUES ($1,$2,$3,(SELECT COALESCE(max(sort_order),0)+1 FROM subjects WHERE exam_id=$1)) ON CONFLICT DO NOTHING RETURNING id', [e.id, b.slug, b.name]);
  if (!s) throw new HttpError(409, 'Subject already exists');
  await audit(pool, uid(req), 'subject.create', 'subject', String(s.id), b);
  await refreshStats();
  return s;
}));

adminRouter.post('/subjects/:id/chapters', wrap(async (req) => {
  const b = body(z.object({ slug, name: z.string().min(2).max(160), unit_name: z.string().max(120).optional() }), req);
  const c = await one('INSERT INTO chapters(subject_id,slug,name,unit_name,sort_order) VALUES ($1,$2,$3,$4,(SELECT COALESCE(max(sort_order),0)+1 FROM chapters WHERE subject_id=$1)) ON CONFLICT DO NOTHING RETURNING id', [Number(req.params.id), b.slug, b.name, b.unit_name ?? null]);
  if (!c) throw new HttpError(409, 'Chapter already exists');
  await audit(pool, uid(req), 'chapter.create', 'chapter', String(c.id), b);
  await refreshStats();
  return c;
}));

adminRouter.patch('/chapters/:id', wrap(async (req) => {
  const b = body(z.object({ name: z.string().min(2).max(160).optional(), unit_name: z.string().max(120).optional(), sort_order: z.number().int().optional() }), req);
  const c = await one('UPDATE chapters SET name = COALESCE($2,name), unit_name = COALESCE($3,unit_name), sort_order = COALESCE($4,sort_order) WHERE id = $1 RETURNING id', [Number(req.params.id), b.name ?? null, b.unit_name ?? null, b.sort_order ?? null]);
  if (!c) throw new HttpError(404, 'Chapter not found');
  await audit(pool, uid(req), 'chapter.update', 'chapter', req.params.id, b);
  return c;
}));

adminRouter.post('/chapters/:id/topics', wrap(async (req) => {
  const b = body(z.object({ slug, name: z.string().min(2).max(160) }), req);
  const t = await one('INSERT INTO topics(chapter_id,slug,name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id', [Number(req.params.id), b.slug, b.name]);
  if (!t) throw new HttpError(409, 'Topic already exists');
  await audit(pool, uid(req), 'topic.create', 'topic', String(t.id), b);
  return t;
}));

adminRouter.delete('/topics/:id', wrap(async (req) => {
  const used = await one('SELECT count(*) n FROM question_topics WHERE topic_id = $1', [Number(req.params.id)]);
  if (Number(used!.n) > 0) throw new HttpError(409, `Topic is used by ${used!.n} question(s); untag them first`);
  await pool.query('DELETE FROM topics WHERE id = $1', [Number(req.params.id)]);
  await audit(pool, uid(req), 'topic.delete', 'topic', req.params.id);
  return { deleted: true };
}));

adminRouter.post('/exams/:slug/syllabus-versions', wrap(async (req) => {
  const b = body(z.object({ label: z.string().min(3).max(160), effective_from_year: z.number().int().optional(), is_verified: z.boolean().default(false), notes: z.string().max(2000).optional() }), req);
  const e = await one('SELECT id FROM exams WHERE slug = $1', [req.params.slug]);
  if (!e) throw new HttpError(404, 'Exam not found');
  const v = await one('INSERT INTO syllabus_versions(exam_id,label,effective_from_year,is_verified,notes) VALUES ($1,$2,$3,$4,$5) RETURNING id', [e.id, b.label, b.effective_from_year ?? null, b.is_verified, b.notes ?? null]);
  await audit(pool, uid(req), 'syllabus.create', 'syllabus_version', String(v.id), b);
  return v;
}));

adminRouter.put('/chapters/:id/syllabus', wrap(async (req) => {
  const b = body(z.object({ syllabus_version_id: z.number().int(), status: z.enum(['in_syllabus', 'reduced', 'removed']).nullable(), note: z.string().max(500).optional() }), req);
  if (b.status === null) await pool.query('DELETE FROM chapter_syllabus WHERE chapter_id = $1 AND syllabus_version_id = $2', [Number(req.params.id), b.syllabus_version_id]);
  else
    await pool.query(
      'INSERT INTO chapter_syllabus(chapter_id,syllabus_version_id,status,note) VALUES ($1,$2,$3,$4) ON CONFLICT (chapter_id,syllabus_version_id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note',
      [Number(req.params.id), b.syllabus_version_id, b.status, b.note ?? null],
    );
  await audit(pool, uid(req), 'syllabus.map', 'chapter', req.params.id, b);
  return { ok: true };
}));

// ---------------------------------------------------------------- sources
adminRouter.get('/sources', wrap(async () => ({
  sources: (await pool.query('SELECT sr.*, (SELECT count(*) FROM questions q WHERE q.source_record_id = sr.id) questions FROM source_records sr ORDER BY id DESC')).rows,
})));

adminRouter.post('/sources', wrap(async (req) => {
  const b = body(sourceSchema, req);
  const s = await one(
    `INSERT INTO source_records(source_type,title,publisher,url,license,rights_holder,permission_note,retrieved_at,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [b.source_type, b.title, b.publisher ?? null, b.url ?? null, b.license, b.rights_holder ?? null, b.permission_note, b.retrieved_at ?? null, b.notes ?? null],
  );
  await audit(pool, uid(req), 'source.create', 'source_record', String(s.id), { title: b.title, type: b.source_type });
  return s;
}));

// ---------------------------------------------------------------- papers
adminRouter.get('/papers', wrap(async (req) => {
  const exam = typeof req.query.exam === 'string' ? req.query.exam : null;
  return {
    papers: (
      await pool.query(
        `SELECT p.public_id, p.title, p.kind, p.year, p.exam_date, p.shift, p.availability, p.status, p.verification_status, e.slug exam,
                (SELECT count(*) FROM paper_questions pq WHERE pq.paper_id = p.id) questions
         FROM papers p JOIN exams e ON e.id = p.exam_id WHERE ($1::text IS NULL OR e.slug = $1) ORDER BY e.sort_order, p.year DESC NULLS LAST, p.exam_date DESC NULLS LAST`,
        [exam],
      )
    ).rows,
  };
}));

const paperFields = z.object({
  title: z.string().min(3).max(200),
  kind: z.enum(['past_paper', 'sample']),
  year: z.number().int().min(1950).max(2100).nullable().optional(),
  session: z.string().max(80).nullable().optional(),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  shift: z.string().max(40).nullable().optional(),
  paper_number: z.number().int().positive().nullable().optional(),
  duration_minutes: z.number().int().positive().max(600).nullable().optional(),
  total_marks: z.number().positive().nullable().optional(),
  sections: z.array(z.object({ key: z.string().min(1).max(40), name: z.string().min(1).max(120), subject_slug: z.string().optional(), instructions: z.string().max(2000).optional() })).optional(),
  availability: z.enum(['full', 'partial', 'metadata_only']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  verification_status: z.enum(['unverified', 'verified', 'needs_correction']).optional(),
  notes: z.string().max(2000).nullable().optional(),
  source_record_id: z.number().int().optional(),
});

adminRouter.post('/papers', wrap(async (req) => {
  const b = body(paperFields.extend({ exam: slug }), req);
  const e = await one('SELECT id FROM exams WHERE slug = $1', [b.exam]);
  if (!e) throw new HttpError(400, 'Unknown exam');
  if (b.kind === 'past_paper' && !b.year) throw new HttpError(400, 'Past papers need a year');
  const pid = randomPublicId();
  await pool.query(
    `INSERT INTO papers(public_id,exam_id,slug,title,kind,year,session,exam_date,shift,paper_number,duration_minutes,total_marks,sections,availability,status,verification_status,notes,source_record_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [pid, e.id, slugify(b.title), b.title, b.kind, b.year ?? null, b.session ?? null, b.exam_date ?? null, b.shift ?? null, b.paper_number ?? null, b.duration_minutes ?? null,
      b.total_marks ?? null, JSON.stringify(b.sections ?? []), b.availability ?? 'metadata_only', b.status ?? 'draft', b.verification_status ?? 'unverified', b.notes ?? null, b.source_record_id ?? null],
  );
  await audit(pool, uid(req), 'paper.create', 'paper', pid, { title: b.title });
  return { public_id: pid };
}));

adminRouter.patch('/papers/:pid', wrap(async (req) => {
  const b = body(paperFields.partial(), req);
  const cols = Object.entries(b).filter(([, v]) => v !== undefined);
  if (!cols.length) throw new HttpError(400, 'Nothing to update');
  const sets = cols.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const vals = cols.map(([k, v]) => (k === 'sections' ? JSON.stringify(v) : v));
  const r = await one(`UPDATE papers SET ${sets}, updated_at = now() WHERE public_id = $1 RETURNING public_id`, [req.params.pid, ...vals]);
  if (!r) throw new HttpError(404, 'Paper not found');
  await audit(pool, uid(req), 'paper.update', 'paper', req.params.pid, b);
  await refreshStats();
  return r;
}));

/** Replace a paper's question list (ordering, numbering, sections). */
adminRouter.put('/papers/:pid/questions', wrap(async (req) => {
  const b = body(z.object({ items: z.array(z.object({ question: z.string().max(20), number: z.number().int().positive(), section: z.string().max(40).nullable().optional(), marks: z.number().nullable().optional(), negative_marks: z.number().nullable().optional() })).max(300) }), req);
  const numbers = b.items.map((i) => i.number);
  if (new Set(numbers).size !== numbers.length) throw new HttpError(400, 'Question numbers must be unique');
  const p = await one('SELECT id FROM papers WHERE public_id = $1', [req.params.pid]);
  if (!p) throw new HttpError(404, 'Paper not found');
  await tx(async (c) => {
    const ids = (await c.query('SELECT id, public_id FROM questions WHERE public_id = ANY($1)', [b.items.map((i) => i.question)])).rows;
    const m = new Map(ids.map((r) => [r.public_id, r.id]));
    const missing = b.items.filter((i) => !m.has(i.question));
    if (missing.length) throw new HttpError(400, `Unknown questions: ${missing.map((x) => x.question).join(', ')}`);
    await c.query('DELETE FROM paper_questions WHERE paper_id = $1', [p.id]);
    for (const i of b.items)
      await c.query('INSERT INTO paper_questions(paper_id,question_id,section_key,question_number,marks,negative_marks) VALUES ($1,$2,$3,$4,$5,$6)', [p.id, m.get(i.question), i.section ?? null, i.number, i.marks ?? null, i.negative_marks ?? null]);
    await audit(c, uid(req), 'paper.questions', 'paper', req.params.pid, { count: b.items.length });
    await refreshStats(c);
  });
  return { ok: true };
}));

// ---------------------------------------------------------------- questions
const listQuery = z.object({
  q: z.string().max(200).optional(),
  exam: z.string().max(60).optional(),
  status: z.enum(['draft', 'in_review', 'published', 'archived']).optional(),
  verification: z.enum(['unverified', 'verified', 'needs_correction']).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

adminRouter.get('/questions', wrap(async (req) => {
  const f = parseQuery(listQuery, req);
  const params: unknown[] = [];
  const w: string[] = ['true'];
  const p = (v: unknown) => (params.push(v), `$${params.length}`);
  if (f.q) w.push(`(q.search_text ILIKE ${p(`%${f.q}%`)} OR q.public_id = ${p(f.q)} OR q.source_ref ILIKE ${p(`%${f.q}%`)})`);
  if (f.exam) w.push(`e.slug = ${p(f.exam)}`);
  if (f.status) w.push(`q.status = ${p(f.status)}`);
  if (f.verification) w.push(`q.verification_status = ${p(f.verification)}`);
  const from = `FROM questions q JOIN exams e ON e.id = q.exam_id JOIN subjects s ON s.id = q.subject_id JOIN chapters c ON c.id = q.chapter_id JOIN source_records sr ON sr.id = q.source_record_id WHERE ${w.join(' AND ')}`;
  const total = Number((await pool.query(`SELECT count(*) n ${from}`, params)).rows[0].n);
  const rows = (
    await pool.query(
      `SELECT q.public_id, q.type, q.status, q.verification_status, q.is_pyq, q.updated_at, left(q.search_text, 160) preview, e.slug exam, s.name subject, c.name chapter, sr.source_type,
              (SELECT count(*) FROM content_reports r WHERE r.question_id = q.id AND r.status = 'open') open_reports
       ${from} ORDER BY q.updated_at DESC, q.id DESC LIMIT 50 OFFSET ${(f.page - 1) * 50}`,
      params,
    )
  ).rows;
  return { total, page: f.page, pages: Math.max(1, Math.ceil(total / 50)), questions: rows };
}));

adminRouter.get('/questions/:pid', wrap(async (req) => {
  const row = await one('SELECT id, source_record_id FROM questions WHERE public_id = $1', [req.params.pid]);
  if (!row) throw new HttpError(404, 'Question not found');
  const [q] = await loadQuestions([row.id], { withHistory: true, includeUnpublished: true });
  const revisions = (await pool.query('SELECT r.revision, r.change_note, r.created_at, u.email author FROM question_revisions r LEFT JOIN users u ON u.id = r.created_by WHERE r.question_id = $1 ORDER BY r.revision DESC', [row.id])).rows;
  const reports = (await pool.query('SELECT id, reason, details, status, resolution_note, created_at FROM content_reports WHERE question_id = $1 ORDER BY created_at DESC', [row.id])).rows;
  const duplicates = (await pool.query(`SELECT q2.public_id FROM questions q1 JOIN questions q2 ON q2.content_hash = q1.content_hash AND q2.id <> q1.id WHERE q1.id = $1 AND q2.status <> 'archived'`, [row.id])).rows.map((r) => r.public_id);
  return { question: q, revisions, reports, duplicates, source_record_id: row.source_record_id };
}));

const editSchema = z.object({
  subject: slug,
  chapter: slug,
  type: z.enum(QUESTION_TYPES),
  body: z.string().min(5).max(20000),
  options: z.array(z.object({ label: z.string().regex(/^[A-Z]$/), body: z.string().min(1).max(5000) })).default([]),
  matrix: z.any().nullable().optional(),
  marks: z.number().nullable().optional(),
  negative_marks: z.number().nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
  topics: z.array(slug).default([]),
  status: z.enum(['draft', 'in_review', 'published', 'archived']),
  verification_status: z.enum(['unverified', 'verified', 'needs_correction']),
  is_pyq: z.boolean().default(false),
  solutions: z.array(z.object({ kind: z.enum(['official', 'editorial', 'community']), method_label: z.string().max(120).nullable().optional(), body: z.string().min(1).max(20000), is_verified: z.boolean().default(false), author_name: z.string().max(120).nullable().optional() })).default([]),
  answer: answerKeySchema.optional(),
  change_note: z.string().trim().min(3, 'describe the change').max(500),
});
type Edit = z.infer<typeof editSchema>;

async function validateEdit(e: Edit, examId: number, sourceType: string, currentAnswer: any) {
  const issues: string[] = [];
  const optionTypes = ['mcq_single', 'mcq_multi', 'matrix_match', 'assertion_reason'];
  if (optionTypes.includes(e.type)) {
    if (e.options.length < 2) issues.push('At least two options are required');
    e.options.forEach((o, i) => o.label !== String.fromCharCode(65 + i) && issues.push('Option labels must run A, B, C, … in order'));
  } else if (e.options.length) issues.push(`${e.type} questions must not have options`);
  if (e.type === 'matrix_match' && !e.matrix) issues.push('Matrix-match questions need List-I / List-II data');
  const answer = e.answer ?? currentAnswer;
  if (!answer) issues.push('An answer key is required');
  else {
    const v = answer.value;
    if (optionTypes.includes(e.type)) {
      if (!('options' in v)) issues.push('This type needs an option answer — add a new answer key version');
      else for (const l of v.options) if (!e.options.some((o) => o.label === l)) issues.push(`Answer option ${l} does not exist`);
    } else if ('options' in v) issues.push('Numeric types need a numeric/range answer — add a new answer key version');
  }
  const official = ['official_document', 'licensed_dataset', 'public_domain'].includes(sourceType);
  if (!official && e.solutions.some((s) => s.kind === 'official')) issues.push('Only official/licensed sources may carry official solutions');
  if (!official && e.answer?.source === 'official') issues.push('Only official/licensed sources may carry an official answer key');
  if (e.is_pyq && ['original_sample', 'test_fixture', 'user_contribution'].includes(sourceType)) issues.push('This source cannot supply past-year questions');
  const diagrams = Object.fromEntries((await pool.query('SELECT public_id, url, alt_text, caption, width, height FROM diagram_assets')).rows.map((d) => [d.public_id, d]));
  for (const t of [e.body, ...e.options.map((o) => o.body), ...e.solutions.map((s) => s.body)]) {
    for (const d of diagramRefs(t)) if (!diagrams[d]) issues.push(`Unknown diagram "${d}"`);
    const m = renderContent(t, { diagrams }).match(/class="katex-error"[^>]*title="([^"]*)"/);
    if (m) issues.push(`Formula error: ${m[1].slice(0, 160)}`);
  }
  const s = await one('SELECT s.id sid, c.id cid FROM subjects s JOIN chapters c ON c.subject_id = s.id WHERE s.exam_id = $1 AND s.slug = $2 AND c.slug = $3', [examId, e.subject, e.chapter]);
  if (!s) issues.push('Unknown subject/chapter for this exam');
  if (issues.length) throw new HttpError(400, 'Validation failed', [...new Set(issues)].map((m) => ({ path: '', message: m })));
  return { subjectId: s.sid as number, chapterId: s.cid as number, diagrams };
}

async function writeQuestion(c: any, qid: number, e: Edit, ids: { subjectId: number; chapterId: number }, diagrams: Record<string, any>, userId: number, isNew: boolean) {
  const passage = (await c.query('SELECT p.body FROM questions q LEFT JOIN passages p ON p.id = q.passage_id WHERE q.id = $1', [qid])).rows[0]?.body;
  await c.query(
    `UPDATE questions SET subject_id=$2, chapter_id=$3, type=$4, body=$5, matrix=$6, marks=$7, negative_marks=$8, difficulty=$9, status=$10, verification_status=$11, is_pyq=$12,
       content_hash=$13, search_text=$14, updated_at=now() WHERE id=$1`,
    [qid, ids.subjectId, ids.chapterId, e.type, e.body, e.matrix ? JSON.stringify(e.matrix) : null, e.marks ?? null, e.negative_marks ?? null, e.difficulty ?? null, e.status,
      e.verification_status, e.is_pyq, contentHash(e.body, e.options), searchTextFor(e.body, e.options, passage)],
  );
  await c.query('DELETE FROM options WHERE question_id = $1', [qid]);
  for (const [i, o] of e.options.entries()) await c.query('INSERT INTO options(question_id,label,body,sort_order) VALUES ($1,$2,$3,$4)', [qid, o.label, o.body, i]);
  await c.query('DELETE FROM solutions WHERE question_id = $1', [qid]);
  for (const [i, s] of e.solutions.entries())
    await c.query('INSERT INTO solutions(question_id,kind,method_label,body,is_verified,author_name,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)', [qid, s.kind, s.method_label ?? null, s.body, s.is_verified, s.author_name ?? null, i]);
  await c.query('DELETE FROM question_topics WHERE question_id = $1', [qid]);
  for (const t of e.topics) {
    const tid = (await c.query('INSERT INTO topics(chapter_id,slug,name) VALUES ($1,$2,initcap(replace($2,\'-\',\' \'))) ON CONFLICT (chapter_id,slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id', [ids.chapterId, t])).rows[0].id;
    await c.query('INSERT INTO question_topics VALUES ($1,$2) ON CONFLICT DO NOTHING', [qid, tid]);
  }
  await c.query('DELETE FROM question_diagrams WHERE question_id = $1', [qid]);
  for (const d of new Set([e.body, ...e.options.map((o) => o.body), ...e.solutions.map((s) => s.body)].flatMap(diagramRefs)))
    await c.query('INSERT INTO question_diagrams(question_id, diagram_id) SELECT $1, id FROM diagram_assets WHERE public_id = $2 ON CONFLICT DO NOTHING', [qid, d]);
  if (e.answer) await addAnswerKey(c, qid, e.answer, userId);
  await snapshotQuestion(c, qid, (isNew ? 'Created: ' : '') + e.change_note, userId);
}

async function addAnswerKey(c: any, qid: number, k: z.infer<typeof answerKeySchema>, userId: number) {
  const v = (await c.query('SELECT COALESCE(max(version),0)+1 n FROM answer_keys WHERE question_id = $1', [qid])).rows[0].n;
  await c.query('UPDATE answer_keys SET is_current = false WHERE question_id = $1', [qid]);
  await c.query('INSERT INTO answer_keys(question_id,version,value,status,source,is_current,note,effective_at,created_by) VALUES ($1,$2,$3,$4,$5,true,$6,$7,$8)', [
    qid, v, JSON.stringify(k.value), k.status, k.source, k.note ?? null, k.effective_at ?? null, userId,
  ]);
}

adminRouter.post('/questions', wrap(async (req) => {
  const b = body(editSchema.extend({ exam: slug, source_record_id: z.number().int(), answer: answerKeySchema }), req);
  const exam = await one('SELECT id FROM exams WHERE slug = $1', [b.exam]);
  if (!exam) throw new HttpError(400, 'Unknown exam');
  const src = await one('SELECT source_type FROM source_records WHERE id = $1', [b.source_record_id]);
  if (!src) throw new HttpError(400, 'Unknown source record');
  const ids = await validateEdit(b, exam.id, src.source_type, null);
  const pid = randomPublicId();
  const hash = contentHash(b.body, b.options);
  const dup = (await pool.query(`SELECT public_id FROM questions WHERE content_hash = $1 AND status <> 'archived'`, [hash])).rows.map((r) => r.public_id);
  await tx(async (c) => {
    const qid = (
      await c.query(
        `INSERT INTO questions(public_id,exam_id,subject_id,chapter_id,type,body,status,verification_status,source_record_id,content_hash,created_by) VALUES ($1,$2,$3,$4,$5,$6,'draft','unverified',$7,$8,$9) RETURNING id`,
        [pid, exam.id, ids.subjectId, ids.chapterId, b.type, b.body, b.source_record_id, hash, uid(req)],
      )
    ).rows[0].id;
    await writeQuestion(c, qid, b, ids, ids.diagrams, uid(req), true);
    await audit(c, uid(req), 'question.create', 'question', pid, { status: b.status });
    await refreshStats(c);
  });
  return { public_id: pid, possible_duplicates: dup };
}));

adminRouter.put('/questions/:pid', wrap(async (req) => {
  const b = body(editSchema, req);
  const row = await one('SELECT q.id, q.exam_id, sr.source_type FROM questions q JOIN source_records sr ON sr.id = q.source_record_id WHERE q.public_id = $1', [req.params.pid]);
  if (!row) throw new HttpError(404, 'Question not found');
  const current = await one('SELECT value FROM answer_keys WHERE question_id = $1 AND is_current', [row.id]);
  const ids = await validateEdit(b, row.exam_id, row.source_type, current);
  await tx(async (c) => {
    await writeQuestion(c, row.id, b, ids, ids.diagrams, uid(req), false);
    await audit(c, uid(req), 'question.update', 'question', req.params.pid, { note: b.change_note, status: b.status });
    await refreshStats(c);
  });
  return { ok: true };
}));

adminRouter.post('/questions/:pid/answer-keys', wrap(async (req) => {
  const b = body(answerKeySchema, req);
  const row = await one('SELECT q.id, q.type, sr.source_type FROM questions q JOIN source_records sr ON sr.id = q.source_record_id WHERE q.public_id = $1', [req.params.pid]);
  if (!row) throw new HttpError(404, 'Question not found');
  if (b.source === 'official' && !['official_document', 'licensed_dataset', 'public_domain'].includes(row.source_type)) throw new HttpError(400, 'Only official/licensed sources may carry an official answer key');
  const isOpt = ['mcq_single', 'mcq_multi', 'matrix_match', 'assertion_reason'].includes(row.type);
  if (isOpt !== 'options' in b.value) throw new HttpError(400, 'Answer value does not match the question type');
  await tx(async (c) => {
    await addAnswerKey(c, row.id, b, uid(req));
    await snapshotQuestion(c, row.id, `Answer key: ${b.status}${b.note ? ' — ' + b.note : ''}`, uid(req));
    await audit(c, uid(req), 'answer_key.add', 'question', req.params.pid, b);
  });
  return { ok: true };
}));

adminRouter.post('/questions/:pid/status', wrap(async (req) => {
  const b = body(z.object({ status: z.enum(['draft', 'in_review', 'published', 'archived']).optional(), verification_status: z.enum(['unverified', 'verified', 'needs_correction']).optional(), note: z.string().max(500).optional() }), req);
  const row = await one('SELECT id FROM questions WHERE public_id = $1', [req.params.pid]);
  if (!row) throw new HttpError(404, 'Question not found');
  if (b.status === 'published' && !(await one('SELECT 1 FROM answer_keys WHERE question_id = $1 AND is_current', [row.id]))) throw new HttpError(409, 'Cannot publish a question without an answer key');
  await tx(async (c) => {
    await c.query('UPDATE questions SET status = COALESCE($2,status), verification_status = COALESCE($3,verification_status), updated_at = now() WHERE id = $1', [row.id, b.status ?? null, b.verification_status ?? null]);
    await snapshotQuestion(c, row.id, `Status: ${[b.status, b.verification_status].filter(Boolean).join(', ')}${b.note ? ' — ' + b.note : ''}`, uid(req));
    await audit(c, uid(req), 'question.status', 'question', req.params.pid, b);
    await refreshStats(c);
  });
  return { ok: true };
}));

adminRouter.get('/questions/:pid/revisions/:rev', wrap(async (req) => {
  const r = await one('SELECT r.* FROM question_revisions r JOIN questions q ON q.id = r.question_id WHERE q.public_id = $1 AND r.revision = $2', [req.params.pid, Number(req.params.rev)]);
  if (!r) throw new HttpError(404, 'Revision not found');
  return r;
}));

/** Restore content from a revision (as a new revision; answer-key history is append-only and untouched). */
adminRouter.post('/questions/:pid/revisions/:rev/restore', wrap(async (req) => {
  const row = await one('SELECT q.id FROM questions q WHERE q.public_id = $1', [req.params.pid]);
  if (!row) throw new HttpError(404, 'Question not found');
  const r = await one('SELECT snapshot FROM question_revisions WHERE question_id = $1 AND revision = $2', [row.id, Number(req.params.rev)]);
  if (!r) throw new HttpError(404, 'Revision not found');
  const s = r.snapshot;
  const e: Edit = {
    subject: s.subject.slug, chapter: s.chapter.slug, type: s.type, body: s.body, options: s.options, matrix: s.matrix, marks: s.marks, negative_marks: s.negative_marks,
    difficulty: s.difficulty, topics: s.topics.map((t: any) => t.slug), status: s.status, verification_status: s.verification_status, is_pyq: s.is_pyq,
    solutions: s.solutions ?? [], change_note: `Restored revision ${req.params.rev}`,
  };
  const ids = { subjectId: s._ids.subject_id, chapterId: s._ids.chapter_id };
  await tx(async (c) => {
    await writeQuestion(c, row.id, e, ids, {}, uid(req), false);
    await audit(c, uid(req), 'question.restore', 'question', req.params.pid, { revision: Number(req.params.rev) });
    await refreshStats(c);
  });
  return { ok: true };
}));

// ---------------------------------------------------------------- diagrams
const UPLOAD_DIR = path.resolve(__dirname, '../../public/assets/diagrams/uploads');
adminRouter.get('/diagrams', wrap(async () => ({ diagrams: (await pool.query('SELECT public_id, url, alt_text, caption, width, height, license FROM diagram_assets ORDER BY id DESC')).rows })));

adminRouter.post('/diagrams', wrap(async (req) => {
  const b = body(z.object({
    data_base64: z.string().max(4_000_000), mime: z.enum(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']),
    alt_text: z.string().min(10).max(1000), caption: z.string().max(300).optional(), license: z.string().min(2).max(300),
    width: z.number().int().positive().optional(), height: z.number().int().positive().optional(),
  }), req);
  const buf = Buffer.from(b.data_base64, 'base64');
  if (buf.length > 2_500_000) throw new HttpError(413, 'Image too large (max 2.5 MB)');
  const ok =
    (b.mime === 'image/png' && buf.subarray(0, 4).toString('hex') === '89504e47') ||
    (b.mime === 'image/jpeg' && buf.subarray(0, 2).toString('hex') === 'ffd8') ||
    (b.mime === 'image/webp' && buf.subarray(8, 12).toString() === 'WEBP') ||
    (b.mime === 'image/svg+xml' && /<svg[\s>]/i.test(buf.toString('utf8')) && !/<script|on\w+\s*=|javascript:|<foreignObject/i.test(buf.toString('utf8')));
  if (!ok) throw new HttpError(400, 'File content does not match its type, or the SVG contains active content');
  const pid = 'up-' + randomPublicId();
  const ext = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[b.mime];
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, `${pid}.${ext}`), buf);
  const url = `/assets/diagrams/uploads/${pid}.${ext}`;
  await pool.query('INSERT INTO diagram_assets(public_id,url,alt_text,caption,width,height,license) VALUES ($1,$2,$3,$4,$5,$6,$7)', [pid, url, b.alt_text, b.caption ?? null, b.width ?? null, b.height ?? null, b.license]);
  await audit(pool, uid(req), 'diagram.upload', 'diagram', pid, { url });
  return { public_id: pid, url, markup: `![${b.alt_text}](diagram:${pid})` };
}));

// ---------------------------------------------------------------- imports
const uploadBody = z.object({
  format: z.enum(['json', 'csv']),
  filename: z.string().max(200).optional(),
  content: z.string().min(2).max(10_000_000),
  source: sourceSchema.optional(), // required for CSV
});

adminRouter.post('/imports/validate', wrap(async (req) => {
  const b = body(uploadBody, req);
  if (b.format === 'csv' && !b.source) throw new HttpError(400, 'CSV imports need source details (provenance and permission)');
  const { data, issues } = parseUpload(b.format, b.content, b.source);
  const { report, file } = data ? await validateImport(data, issues) : { report: { ok: false, counts: { questions: 0, papers: 0, diagrams: 0, passages: 0 }, errors: issues, warnings: [], duplicates: [] }, file: null };
  const batch = await one(`INSERT INTO import_batches(filename,format,status,report,payload,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [
    b.filename ?? null, b.format, report.ok ? 'validated' : 'failed', report, file, uid(req),
  ]);
  await audit(pool, uid(req), 'import.validate', 'import_batch', String(batch.id), { ok: report.ok, counts: report.counts });
  // preview: first questions as they will appear
  const preview = (file?.questions ?? []).slice(0, 5).map((q) => ({ ref: q.ref, exam: q.exam, subject: q.subject, chapter: q.chapter, type: q.type, body: q.body, options: q.options ?? [], answer: q.answer, solutions: q.solutions, diagrams: Object.fromEntries((file?.diagrams ?? []).map((d) => [d.ref, { public_id: d.ref, ...d }])) }));
  return { batch_id: batch.id, report, preview };
}));

adminRouter.get('/imports', wrap(async () => ({
  imports: (await pool.query('SELECT b.id, b.filename, b.format, b.status, b.report->\'counts\' counts, jsonb_array_length(b.report->\'errors\') errors, b.created_at, b.committed_at, b.rolled_back_at, u.email author FROM import_batches b LEFT JOIN users u ON u.id = b.created_by ORDER BY b.id DESC')).rows,
})));

adminRouter.get('/imports/:id', wrap(async (req) => {
  const b = await one('SELECT id, filename, format, status, report, created_at, committed_at, rolled_back_at, (SELECT count(*) FROM questions WHERE import_batch_id = $1) questions FROM import_batches WHERE id = $1', [Number(req.params.id)]);
  if (!b) throw new HttpError(404, 'Import not found');
  return b;
}));

adminRouter.post('/imports/:id/commit', wrap(async (req) => {
  const b = await one('SELECT id, status, payload, filename, format FROM import_batches WHERE id = $1', [Number(req.params.id)]);
  if (!b) throw new HttpError(404, 'Import not found');
  if (b.status !== 'validated') throw new HttpError(409, `Batch is ${b.status}; only validated batches can be committed`);
  try {
    const r = await commitImport(b.payload, { userId: uid(req), filename: b.filename, format: b.format, batchId: b.id });
    return { batch_id: r.batchId, report: r.report };
  } catch (e: any) {
    if (e.report) throw new HttpError(409, 'Import no longer validates against current data', e.report.errors);
    throw e;
  }
}));

adminRouter.post('/imports/:id/rollback', wrap(async (req) => {
  try {
    return await rollbackImport(Number(req.params.id), uid(req));
  } catch (e: any) {
    if (e.status) throw new HttpError(e.status, e.message);
    throw e;
  }
}));

adminRouter.get('/import-template', wrap(async (req, res) => {
  const fmt = req.query.format === 'csv' ? 'csv' : 'json';
  const file = path.resolve(__dirname, `../../data/import-templates/questions-template.${fmt}`);
  res.download(file, `prepledger-import-template.${fmt}`);
  return undefined;
}));

// ---------------------------------------------------------------- reports (correction workflow)
adminRouter.get('/reports', wrap(async (req) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'open';
  return {
    reports: (
      await pool.query(
        `SELECT r.id, r.reason, r.details, r.status, r.resolution_note, r.created_at, r.resolved_at, q.public_id question, left(q.search_text, 140) preview, u.email reporter
         FROM content_reports r JOIN questions q ON q.id = r.question_id LEFT JOIN users u ON u.id = r.user_id WHERE ($1 = 'all' OR r.status = $1) ORDER BY r.created_at DESC LIMIT 200`,
        [status],
      )
    ).rows,
  };
}));

adminRouter.patch('/reports/:id', wrap(async (req) => {
  const b = body(z.object({ status: z.enum(['open', 'accepted', 'rejected', 'resolved']), resolution_note: z.string().max(2000).optional(), flag_question: z.boolean().optional() }), req);
  const r = await one(
    `UPDATE content_reports SET status=$2, resolution_note=COALESCE($3,resolution_note), resolved_by=$4, resolved_at=CASE WHEN $2 IN ('resolved','rejected') THEN now() ELSE NULL END WHERE id=$1 RETURNING question_id`,
    [Number(req.params.id), b.status, b.resolution_note ?? null, uid(req)],
  );
  if (!r) throw new HttpError(404, 'Report not found');
  if (b.flag_question) await pool.query(`UPDATE questions SET verification_status = 'needs_correction', updated_at = now() WHERE id = $1`, [r.question_id]);
  await audit(pool, uid(req), 'report.update', 'content_report', req.params.id, b);
  return { ok: true };
}));

// ---------------------------------------------------------------- audit log & users
adminRouter.get('/audit', wrap(async (req) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const rows = (await pool.query(`SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at, u.email actor FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 100 OFFSET $1`, [(page - 1) * 100])).rows;
  const total = Number((await one('SELECT count(*) n FROM audit_log'))!.n);
  return { entries: rows, page, pages: Math.max(1, Math.ceil(total / 100)) };
}));

adminRouter.get('/users', requireRole('admin'), wrap(async () => ({ users: (await pool.query('SELECT id, email, display_name, role, created_at FROM users ORDER BY id')).rows })));

adminRouter.patch('/users/:id', requireRole('admin'), wrap(async (req) => {
  const b = body(z.object({ role: z.enum(['student', 'editor', 'admin']) }), req);
  if (Number(req.params.id) === uid(req) && b.role !== 'admin') throw new HttpError(409, 'You cannot demote yourself');
  const r = await one('UPDATE users SET role = $2 WHERE id = $1 RETURNING id', [Number(req.params.id), b.role]);
  if (!r) throw new HttpError(404, 'User not found');
  await audit(pool, uid(req), 'user.role', 'user', req.params.id, b);
  return { ok: true };
}));
