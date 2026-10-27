import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { ruleFor, scoreResponse } from '../../shared/scoring';
import type { MarkingScheme, Response as Resp } from '../../shared/types';
import { one, pool, tx } from '../db';
import { audit } from '../lib/audit';
import { requireUser } from '../lib/auth';
import { body, HttpError, wrap } from '../lib/http';
import { randomPublicId } from '../lib/ids';
import { loadQuestions } from '../lib/questions';
import { paperDetail, parseQuery } from './public';

export const testsRouter = Router();

const responseSchema = z.union([z.object({ options: z.array(z.string().regex(/^[A-Z]$/)).max(10) }), z.object({ value: z.number().finite() }), z.null()]);

// ---------------------------------------------------------------- test definitions (no answers sent)
testsRouter.get('/tests/paper/:publicId', wrap(async (req) => {
  const d = await paperDetail(req.params.publicId, { withAnswers: false });
  if (!d.items.length) throw new HttpError(409, 'This paper has no questions available, so it cannot be attempted.');
  return d;
}));

const customQuery = z.object({
  exam: z.string().max(60),
  chapters: z.string().max(4000), // "subject/chapter,subject/chapter"
  n: z.coerce.number().int().min(1).max(100).default(10),
  seed: z.string().max(40).default('default'),
  minutes: z.coerce.number().int().min(1).max(600).optional(),
});

export async function customTestQuestions(def: z.infer<typeof customQuery>) {
  const exam = await one('SELECT id, slug, name, marking_scheme FROM exams WHERE slug = $1', [def.exam]);
  if (!exam) throw new HttpError(404, 'Exam not found');
  const pairs = def.chapters.split(',').map((x) => x.trim().split('/')).filter((x) => x.length === 2);
  if (!pairs.length) throw new HttpError(400, 'Select at least one chapter');
  const rows = (
    await pool.query(
      `SELECT q.id, q.public_id FROM questions q JOIN subjects s ON s.id = q.subject_id JOIN chapters c ON c.id = q.chapter_id
       WHERE q.exam_id = $1 AND q.status = 'published' AND (s.slug || '/' || c.slug) = ANY($2)`,
      [exam.id, pairs.map((p) => p.join('/'))],
    )
  ).rows;
  if (!rows.length) throw new HttpError(409, 'No published questions are available in the selected chapters.');
  const h = (s: string) => crypto.createHash('sha1').update(def.seed + ':' + s).digest('hex');
  const picked = rows.sort((a, b) => (h(a.public_id) < h(b.public_id) ? -1 : 1)).slice(0, def.n);
  return { exam, ids: picked.map((r) => r.id) };
}

testsRouter.get('/tests/custom', wrap(async (req) => {
  const def = parseQuery(customQuery, req);
  const { exam, ids } = await customTestQuestions(def);
  const qs = await loadQuestions(ids, { withAnswers: false });
  return {
    paper: {
      public_id: null, title: `${exam.name} custom practice test`, kind: 'custom', duration_minutes: def.minutes ?? Math.max(5, Math.round(qs.length * 2.5)),
      sections: [], marking_scheme: exam.marking_scheme,
    },
    exam: { slug: exam.slug, name: exam.name },
    definition: def,
    items: qs.map((q, i) => ({ number: i + 1, section: q.subject.slug, marks: null, negative_marks: null, question: q })),
  };
}));

// ---------------------------------------------------------------- scoring
export async function scoreSet(input: { exam: string; paper?: string | null; questions: string[]; responses: Record<string, Resp> }) {
  const exam = await one('SELECT id, marking_scheme FROM exams WHERE slug = $1', [input.exam]);
  if (!exam) throw new HttpError(404, 'Exam not found');
  let scheme: MarkingScheme = exam.marking_scheme;
  const overrides = new Map<number, { marks: number | null; negative_marks: number | null; section: string | null; number: number }>();
  let paperId: number | null = null;
  if (input.paper) {
    const p = await one('SELECT id, marking_scheme FROM papers WHERE public_id = $1', [input.paper]);
    if (!p) throw new HttpError(404, 'Paper not found');
    paperId = p.id;
    if (p.marking_scheme) scheme = p.marking_scheme;
    for (const r of (await pool.query('SELECT question_id, marks, negative_marks, section_key, question_number FROM paper_questions WHERE paper_id = $1', [p.id])).rows)
      overrides.set(r.question_id, { marks: r.marks, negative_marks: r.negative_marks, section: r.section_key, number: r.question_number });
  }
  const idRows = (await pool.query(`SELECT id, public_id FROM questions WHERE public_id = ANY($1) AND status = 'published'`, [input.questions])).rows;
  const idByPid = new Map(idRows.map((r) => [r.public_id, r.id]));
  const ordered = input.questions.map((p) => idByPid.get(p)).filter((x): x is number => x != null);
  const qs = await loadQuestions(ordered);
  let total = 0;
  let max = 0;
  const summary = { correct: 0, wrong: 0, partial: 0, unattempted: 0, ungraded: 0 };
  const bySection: Record<string, { score: number; max: number; correct: number; attempted: number; count: number }> = {};
  const items = qs.map((q) => {
    const ov = overrides.get(q.id);
    const rule = ruleFor(scheme, q.type, { marks: ov?.marks ?? q.marks, negative_marks: ov?.negative_marks ?? q.negative_marks });
    const response = input.responses[q.public_id] ?? null;
    const result = scoreResponse({ type: q.type, key: q.answer ? { value: q.answer.value, status: q.answer.status } : null, response, rule });
    total += result.marks;
    max += rule.correct;
    if (!q.answer) summary.ungraded++;
    else if (!result.attempted && q.answer.status !== 'dropped') summary.unattempted++;
    else if (result.correct) summary.correct++;
    else if (result.partial) summary.partial++;
    else summary.wrong++;
    const sec = ov?.section ?? q.subject.slug;
    bySection[sec] ??= { score: 0, max: 0, correct: 0, attempted: 0, count: 0 };
    bySection[sec].score += result.marks;
    bySection[sec].max += rule.correct;
    bySection[sec].count++;
    if (result.attempted) bySection[sec].attempted++;
    if (result.correct) bySection[sec].correct++;
    return { public_id: q.public_id, id: q.id, rule, response, result, question: q };
  });
  return { paperId, total, max, summary, by_section: bySection, items };
}

const scoreBody = z.object({
  exam: z.string().max(60),
  paper: z.string().max(20).nullable().optional(),
  questions: z.array(z.string().max(20)).min(1).max(300),
  responses: z.record(z.string().max(20), responseSchema),
});

/** Stateless scoring for anonymous test takers. */
testsRouter.post('/tests/score', wrap(async (req) => {
  const b = body(scoreBody, req);
  const r = await scoreSet(b);
  return { ...r, items: r.items.map(({ id: _id, ...x }) => x) };
}));

// ---------------------------------------------------------------- persisted attempts (signed-in users)
const startBody = z.object({
  kind: z.enum(['paper_test', 'custom_test']),
  paper: z.string().max(20).optional(),
  definition: z.record(z.string(), z.unknown()).optional(),
});

testsRouter.post('/attempts', requireUser, wrap(async (req) => {
  const b = body(startBody, req);
  let paperId: number | null = null;
  if (b.kind === 'paper_test') {
    const p = await one('SELECT id FROM papers WHERE public_id = $1', [b.paper]);
    if (!p) throw new HttpError(404, 'Paper not found');
    paperId = p.id;
    const existing = await one(`SELECT public_id FROM attempts WHERE user_id = $1 AND paper_id = $2 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1`, [req.user!.id, paperId]);
    if (existing) return { public_id: existing.public_id, resumed: true };
  }
  const pid = randomPublicId();
  await pool.query(`INSERT INTO attempts(public_id,user_id,kind,paper_id,definition,status) VALUES ($1,$2,$3,$4,$5,'in_progress')`, [pid, req.user!.id, b.kind, paperId, b.definition ?? {}]);
  return { public_id: pid, resumed: false };
}));

async function ownAttempt(pid: string, userId: number) {
  const a = await one('SELECT a.*, p.public_id paper_public_id FROM attempts a LEFT JOIN papers p ON p.id = a.paper_id WHERE a.public_id = $1', [pid]);
  if (!a || a.user_id !== userId) throw new HttpError(404, 'Attempt not found');
  return a;
}

testsRouter.get('/attempts/:pid', requireUser, wrap(async (req) => {
  const a = await ownAttempt(req.params.pid, req.user!.id);
  const answers = (
    await pool.query(
      `SELECT q.public_id, aa.response, aa.marked_for_review, aa.is_correct, aa.marks_awarded, aa.time_spent_seconds FROM attempt_answers aa JOIN questions q ON q.id = aa.question_id WHERE aa.attempt_id = $1`,
      [a.id],
    )
  ).rows;
  return {
    attempt: { public_id: a.public_id, kind: a.kind, paper: a.paper_public_id, definition: a.definition, status: a.status, state: a.state, started_at: a.started_at, submitted_at: a.submitted_at, score: a.score, max_score: a.max_score, duration_seconds: a.duration_seconds },
    answers,
  };
}));

const answersSchema = z.array(
  z.object({ question: z.string().max(20), response: responseSchema, marked: z.boolean().default(false), time: z.number().int().min(0).max(86400).default(0) }),
).max(300);
const saveBody = z.object({ state: z.record(z.string(), z.unknown()).default({}), answers: answersSchema });

async function saveAnswers(c: any, attemptId: number, answers: z.infer<typeof answersSchema>) {
  if (!answers.length) return;
  const ids = (await c.query('SELECT id, public_id FROM questions WHERE public_id = ANY($1)', [answers.map((a) => a.question)])).rows;
  const m = new Map(ids.map((r: any) => [r.public_id, r.id]));
  for (const a of answers) {
    const qid = m.get(a.question);
    if (!qid) continue;
    await c.query(
      `INSERT INTO attempt_answers(attempt_id,question_id,response,marked_for_review,time_spent_seconds,updated_at) VALUES ($1,$2,$3,$4,$5,now())
       ON CONFLICT (attempt_id,question_id) DO UPDATE SET response=EXCLUDED.response, marked_for_review=EXCLUDED.marked_for_review, time_spent_seconds=EXCLUDED.time_spent_seconds, updated_at=now()`,
      [attemptId, qid, a.response === null ? null : JSON.stringify(a.response), a.marked, a.time],
    );
  }
}

testsRouter.put('/attempts/:pid', requireUser, wrap(async (req) => {
  const a = await ownAttempt(req.params.pid, req.user!.id);
  if (a.status !== 'in_progress') throw new HttpError(409, 'Attempt already submitted');
  const b = body(saveBody, req);
  await tx(async (c) => {
    await c.query('UPDATE attempts SET state = $2 WHERE id = $1', [a.id, b.state]);
    await saveAnswers(c, a.id, b.answers);
  });
  return { saved: true, at: new Date().toISOString() };
}));

const submitBody = saveBody.extend({ exam: z.string().max(60), questions: z.array(z.string().max(20)).min(1).max(300), duration_seconds: z.number().int().min(0).max(86400) });

testsRouter.post('/attempts/:pid/submit', requireUser, wrap(async (req) => {
  const a = await ownAttempt(req.params.pid, req.user!.id);
  if (a.status !== 'in_progress') throw new HttpError(409, 'Attempt already submitted');
  const b = body(submitBody, req);
  const responses = Object.fromEntries(b.answers.map((x) => [x.question, x.response]));
  const scored = await scoreSet({ exam: b.exam, paper: a.paper_public_id, questions: b.questions, responses });
  await tx(async (c) => {
    await saveAnswers(c, a.id, b.answers);
    for (const it of scored.items) {
      await c.query(
        `INSERT INTO attempt_answers(attempt_id,question_id,response,is_correct,marks_awarded) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (attempt_id,question_id) DO UPDATE SET is_correct = EXCLUDED.is_correct, marks_awarded = EXCLUDED.marks_awarded`,
        [a.id, it.id, it.response ? JSON.stringify(it.response) : null, it.result.correct, it.result.marks],
      );
    }
    await c.query(`UPDATE attempts SET status='submitted', submitted_at=now(), state=$2, score=$3, max_score=$4, duration_seconds=$5, definition = definition || $6 WHERE id=$1`, [
      a.id, b.state, scored.total, scored.max, b.duration_seconds, { questions: b.questions, exam: b.exam },
    ]);
    await audit(c, req.user!.id, 'attempt.submit', 'attempt', a.public_id, { score: scored.total, max: scored.max });
  });
  return { ...scored, items: scored.items.map(({ id: _id, ...x }) => x) };
}));
