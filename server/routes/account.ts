import { Router } from 'express';
import { z } from 'zod';
import { checkResponse } from '../../shared/scoring';
import { env } from '../env';
import { one, pool, tx } from '../db';
import { audit } from '../lib/audit';
import { COOKIE, createSession, destroySession, hashPassword, requireUser, verifyPassword } from '../lib/auth';
import { body, HttpError, wrap } from '../lib/http';
import { loadQuestions } from '../lib/questions';

export const accountRouter = Router();

const cookieOpts = (expires: Date) => ({ httpOnly: true, sameSite: 'lax' as const, secure: env.NODE_ENV === 'production', expires, path: '/' });
const publicUser = (u: any) => (u ? { id: u.id, email: u.email, display_name: u.display_name, role: u.role, preferences: u.preferences } : null);

const credentials = z.object({ email: z.string().email().max(200).transform((s) => s.toLowerCase()), password: z.string().min(8).max(200) });

accountRouter.post('/auth/register', wrap(async (req, res) => {
  const b = body(credentials.extend({ display_name: z.string().trim().min(1).max(80) }), req);
  const exists = await one('SELECT 1 FROM users WHERE email = $1', [b.email]);
  if (exists) throw new HttpError(409, 'An account with this email already exists');
  const u = await one(`INSERT INTO users(email,password_hash,display_name) VALUES ($1,$2,$3) RETURNING *`, [b.email, hashPassword(b.password), b.display_name]);
  const s = await createSession(u.id);
  res.cookie(COOKIE, s.token, cookieOpts(s.expires));
  await audit(pool, u.id, 'user.register', 'user', String(u.id));
  return { user: publicUser(u) };
}));

accountRouter.post('/auth/login', wrap(async (req, res) => {
  const b = body(credentials, req);
  const u = await one('SELECT * FROM users WHERE email = $1', [b.email]);
  if (!u || !verifyPassword(b.password, u.password_hash)) throw new HttpError(401, 'Incorrect email or password');
  const s = await createSession(u.id);
  res.cookie(COOKIE, s.token, cookieOpts(s.expires));
  return { user: publicUser(u) };
}));

accountRouter.post('/auth/logout', wrap(async (req, res) => {
  const t = req.cookies?.[COOKIE];
  if (t) await destroySession(t);
  res.clearCookie(COOKIE, { path: '/' });
  return { ok: true };
}));

accountRouter.get('/auth/me', wrap(async (req) => ({ user: publicUser(req.user) })));

// ---------------------------------------------------------------- preferences
const prefsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  reveal_mode: z.enum(['on_click', 'always']).optional(),
  default_exam: z.string().max(60).optional(),
}).strict();

accountRouter.put('/me/preferences', requireUser, wrap(async (req) => {
  const p = body(prefsSchema, req);
  const u = await one('UPDATE users SET preferences = preferences || $2 WHERE id = $1 RETURNING preferences', [req.user!.id, p]);
  return { preferences: u.preferences };
}));

// ---------------------------------------------------------------- bookmarks
async function qid(publicId: string) {
  const r = await one(`SELECT id FROM questions WHERE public_id = $1 AND status = 'published'`, [publicId]);
  if (!r) throw new HttpError(404, 'Question not found');
  return r.id as number;
}

accountRouter.get('/me/bookmarks', requireUser, wrap(async (req) => {
  const rows = (await pool.query('SELECT question_id, note, created_at FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC', [req.user!.id])).rows;
  const qs = await loadQuestions(rows.map((r) => r.question_id));
  return { bookmarks: qs.map((q) => ({ question: q, note: rows.find((r) => r.question_id === q.id)?.note })) };
}));

accountRouter.get('/me/bookmark-ids', requireUser, wrap(async (req) => ({
  ids: (await pool.query('SELECT q.public_id FROM bookmarks b JOIN questions q ON q.id = b.question_id WHERE b.user_id = $1', [req.user!.id])).rows.map((r) => r.public_id),
})));

accountRouter.put('/me/bookmarks/:pid', requireUser, wrap(async (req) => {
  const b = body(z.object({ note: z.string().max(500).optional() }), req);
  await pool.query('INSERT INTO bookmarks(user_id,question_id,note) VALUES ($1,$2,$3) ON CONFLICT (user_id,question_id) DO UPDATE SET note = EXCLUDED.note', [req.user!.id, await qid(req.params.pid), b.note ?? null]);
  return { bookmarked: true };
}));

accountRouter.delete('/me/bookmarks/:pid', requireUser, wrap(async (req) => {
  await pool.query('DELETE FROM bookmarks WHERE user_id = $1 AND question_id = $2', [req.user!.id, await qid(req.params.pid)]);
  return { bookmarked: false };
}));

// ---------------------------------------------------------------- recently viewed
accountRouter.post('/me/recent/:pid', requireUser, wrap(async (req) => {
  await pool.query('INSERT INTO recent_views(user_id,question_id) VALUES ($1,$2) ON CONFLICT (user_id,question_id) DO UPDATE SET viewed_at = now()', [req.user!.id, await qid(req.params.pid)]);
  await pool.query('DELETE FROM recent_views WHERE user_id = $1 AND question_id NOT IN (SELECT question_id FROM recent_views WHERE user_id = $1 ORDER BY viewed_at DESC LIMIT 50)', [req.user!.id]);
  return { ok: true };
}));

accountRouter.get('/me/recent', requireUser, wrap(async (req) => {
  const rows = (await pool.query('SELECT question_id, viewed_at FROM recent_views WHERE user_id = $1 ORDER BY viewed_at DESC LIMIT 50', [req.user!.id])).rows;
  const qs = await loadQuestions(rows.map((r) => r.question_id), { withAnswers: false });
  return { recent: qs.map((q) => ({ public_id: q.public_id, exam: q.exam, subject: q.subject, chapter: q.chapter, type_label: q.type_label, body: q.body, diagrams: q.diagrams, viewed_at: rows.find((r) => r.question_id === q.id)?.viewed_at })) };
}));

// ---------------------------------------------------------------- practice responses
const practiceBody = z.object({
  response: z.union([z.object({ options: z.array(z.string().regex(/^[A-Z]$/)).min(1).max(10) }), z.object({ value: z.number().finite() })]),
});

accountRouter.post('/me/practice/:pid', requireUser, wrap(async (req) => {
  const b = body(practiceBody, req);
  const id = await qid(req.params.pid);
  const [q] = await loadQuestions([id]);
  if (!q.answer) throw new HttpError(409, 'This question has no answer key yet');
  const correct = q.answer.status === 'dropped' ? true : checkResponse(q.type, q.answer.value, b.response);
  await pool.query('INSERT INTO practice_responses(user_id,question_id,response,is_correct) VALUES ($1,$2,$3,$4)', [req.user!.id, id, b.response, correct]);
  return { is_correct: correct };
}));

accountRouter.delete('/me/practice', requireUser, wrap(async (req) => {
  const b = body(z.object({ exam: z.string().max(60), subject: z.string().max(60), chapter: z.string().max(120) }), req);
  const r = await pool.query(
    `DELETE FROM practice_responses pr USING questions q, exams e, subjects s, chapters c
     WHERE pr.question_id = q.id AND q.exam_id = e.id AND q.subject_id = s.id AND q.chapter_id = c.id
       AND pr.user_id = $1 AND e.slug = $2 AND s.slug = $3 AND c.slug = $4`,
    [req.user!.id, b.exam, b.subject, b.chapter],
  );
  return { deleted: r.rowCount };
}));

accountRouter.get('/me/practice-state', requireUser, wrap(async (req) => {
  // latest practice result per question (for showing previously answered state)
  const rows = (
    await pool.query(
      `SELECT DISTINCT ON (pr.question_id) q.public_id, pr.response, pr.is_correct, pr.created_at FROM practice_responses pr JOIN questions q ON q.id = pr.question_id
       WHERE pr.user_id = $1 ORDER BY pr.question_id, pr.created_at DESC`,
      [req.user!.id],
    )
  ).rows;
  return { state: Object.fromEntries(rows.map((r) => [r.public_id, { response: r.response, is_correct: r.is_correct, at: r.created_at }])) };
}));

accountRouter.get('/me/progress', requireUser, wrap(async (req) => {
  const rows = (
    await pool.query(
      `WITH latest AS (
         SELECT DISTINCT ON (question_id) question_id, is_correct FROM practice_responses WHERE user_id = $1 ORDER BY question_id, created_at DESC)
       SELECT e.slug exam, e.name exam_name, ec.slug category, s.slug subject, s.name subject_name, c.slug chapter, c.name chapter_name,
              cs.question_count total, count(l.question_id) attempted, count(l.question_id) FILTER (WHERE l.is_correct) correct
       FROM latest l JOIN questions q ON q.id = l.question_id JOIN exams e ON e.id = q.exam_id JOIN exam_categories ec ON ec.id = e.category_id
       JOIN subjects s ON s.id = q.subject_id JOIN chapters c ON c.id = q.chapter_id JOIN chapter_statistics cs ON cs.chapter_id = c.id
       GROUP BY e.slug, e.name, ec.slug, s.slug, s.name, c.slug, c.name, cs.question_count, e.sort_order, s.sort_order, c.sort_order
       ORDER BY e.sort_order, s.sort_order, c.sort_order`,
      [req.user!.id],
    )
  ).rows;
  const tests = (await pool.query(`SELECT count(*) FILTER (WHERE status='submitted') submitted, count(*) FILTER (WHERE status='in_progress') in_progress FROM attempts WHERE user_id = $1`, [req.user!.id])).rows[0];
  return { chapters: rows, tests };
}));

accountRouter.get('/me/wrong', requireUser, wrap(async (req) => {
  const rows = (
    await pool.query(
      `SELECT question_id, max(at) at FROM (
         SELECT DISTINCT ON (question_id) question_id, is_correct, created_at at FROM practice_responses WHERE user_id = $1 ORDER BY question_id, created_at DESC
       ) p WHERE NOT is_correct GROUP BY question_id
       UNION
       SELECT aa.question_id, max(a.submitted_at) FROM attempt_answers aa JOIN attempts a ON a.id = aa.attempt_id
       WHERE a.user_id = $1 AND a.status = 'submitted' AND aa.is_correct = false GROUP BY aa.question_id
       ORDER BY at DESC LIMIT 200`,
      [req.user!.id],
    )
  ).rows;
  const ids = [...new Set(rows.map((r) => r.question_id))];
  return { questions: await loadQuestions(ids) };
}));

accountRouter.get('/me/attempts', requireUser, wrap(async (req) => ({
  attempts: (
    await pool.query(
      `SELECT a.public_id, a.kind, a.status, a.started_at, a.submitted_at, a.score, a.max_score, a.duration_seconds, a.definition, p.public_id paper, p.title paper_title, e.slug exam
       FROM attempts a LEFT JOIN papers p ON p.id = a.paper_id LEFT JOIN exams e ON e.id = p.exam_id WHERE a.user_id = $1 ORDER BY a.started_at DESC LIMIT 100`,
      [req.user!.id],
    )
  ).rows,
})));

// ---------------------------------------------------------------- export & delete
accountRouter.get('/me/export', requireUser, wrap(async (req, res) => {
  const id = req.user!.id;
  const q = async (sql: string) => (await pool.query(sql, [id])).rows;
  const data = {
    exported_at: new Date().toISOString(),
    user: publicUser(req.user),
    bookmarks: await q('SELECT q.public_id question, b.note, b.created_at FROM bookmarks b JOIN questions q ON q.id = b.question_id WHERE b.user_id = $1'),
    recent_views: await q('SELECT q.public_id question, r.viewed_at FROM recent_views r JOIN questions q ON q.id = r.question_id WHERE r.user_id = $1'),
    practice_responses: await q('SELECT q.public_id question, p.response, p.is_correct, p.created_at FROM practice_responses p JOIN questions q ON q.id = p.question_id WHERE p.user_id = $1'),
    attempts: await q(`SELECT a.public_id, a.kind, a.status, a.started_at, a.submitted_at, a.score, a.max_score, a.duration_seconds,
                        (SELECT json_agg(json_build_object('question', q.public_id, 'response', aa.response, 'is_correct', aa.is_correct, 'marks', aa.marks_awarded))
                         FROM attempt_answers aa JOIN questions q ON q.id = aa.question_id WHERE aa.attempt_id = a.id) answers
                       FROM attempts a WHERE a.user_id = $1`),
    reports: await q('SELECT q.public_id question, r.reason, r.details, r.status, r.created_at FROM content_reports r JOIN questions q ON q.id = r.question_id WHERE r.user_id = $1'),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="prepledger-my-data.json"');
  return data;
}));

accountRouter.delete('/me', requireUser, wrap(async (req, res) => {
  const b = body(z.object({ password: z.string().min(1).max(200), confirm: z.literal('DELETE') }), req);
  const u = await one('SELECT password_hash, role FROM users WHERE id = $1', [req.user!.id]);
  if (!verifyPassword(b.password, u.password_hash)) throw new HttpError(401, 'Incorrect password');
  if (u.role === 'admin' && Number((await one(`SELECT count(*) n FROM users WHERE role = 'admin'`))!.n) <= 1) throw new HttpError(409, 'The last administrator account cannot be deleted');
  await tx(async (c) => {
    await c.query('DELETE FROM users WHERE id = $1', [req.user!.id]);
    await c.query(`INSERT INTO audit_log(actor_id, action, entity_type, entity_id) VALUES (NULL, 'user.delete', 'user', $1)`, [String(req.user!.id)]);
  });
  res.clearCookie(COOKIE, { path: '/' });
  return { deleted: true };
}));

// ---------------------------------------------------------------- content reports (anyone)
accountRouter.post('/reports', wrap(async (req) => {
  const b = body(z.object({ question: z.string().max(20), reason: z.enum(['wrong_answer', 'typo', 'rendering', 'missing_diagram', 'other']), details: z.string().trim().max(2000).optional() }), req);
  const id = await qid(b.question);
  const r = await one('INSERT INTO content_reports(question_id,user_id,reason,details) VALUES ($1,$2,$3,$4) RETURNING id', [id, req.user?.id ?? null, b.reason, b.details ?? null]);
  return { id: r.id, status: 'open' };
}));
