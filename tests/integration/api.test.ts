import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seed } from '../../scripts/seed';
import { createApp } from '../../server/app';
import { pool } from '../../server/db';

const app = createApp();
const J = { 'Content-Type': 'application/json' };

async function login(email: string, password: string) {
  const agent = request.agent(app);
  const r = await agent.post('/api/auth/login').set(J).send({ email, password });
  expect(r.status).toBe(200);
  return agent;
}
async function registerStudent(email = `s${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.local`) {
  const agent = request.agent(app);
  const r = await agent.post('/api/auth/register').set(J).send({ email, password: 'student-pass-1', display_name: 'Student' });
  expect(r.status).toBe(200);
  return { agent, email };
}

beforeAll(async () => {
  await seed({ reset: true, quiet: true });
});
afterAll(async () => {
  await pool.end();
});

describe('public catalogue', () => {
  it('lists exam categories with honest counts', async () => {
    const r = await request(app).get('/api/exams');
    expect(r.status).toBe(200);
    const exams = r.body.categories.flatMap((c: any) => c.exams);
    expect(exams.map((e: any) => e.slug)).toEqual(expect.arrayContaining(['jee-main', 'jee-advanced', 'neet', 'mht-cet', 'wbjee', 'kcet', 'ap-eapcet', 'ts-eamcet']));
    expect(exams.every((e: any) => Number(e.pyq_count) === 0)).toBe(true);
    expect(exams.find((e: any) => e.slug === 'jee-main').question_count).toBe(18);
  });
  it('exam detail exposes subjects, units, syllabus flags and papers', async () => {
    const r = await request(app).get('/api/exams/jee-main');
    expect(r.status).toBe(200);
    expect(r.body.subjects.map((s: any) => s.slug)).toEqual(['physics', 'chemistry', 'mathematics']);
    const comm = r.body.subjects[0].units.flatMap((u: any) => u.chapters).find((c: any) => c.slug === 'communication-systems');
    expect(comm.syllabus[0]).toMatchObject({ status: 'removed', verified: false });
    expect(r.body.papers.past_paper_count).toBe(20);
    expect(r.body.papers.past_papers_with_questions).toBe(0);
  });
  it('BITSAT and VITEEE keep their exam-specific subjects', async () => {
    expect((await request(app).get('/api/exams/bitsat')).body.subjects.map((s: any) => s.slug)).toEqual(['physics', 'chemistry', 'mathematics', 'english-proficiency', 'logical-reasoning']);
    expect((await request(app).get('/api/exams/viteee')).body.subjects.map((s: any) => s.slug)).toContain('aptitude');
    expect((await request(app).get('/api/exams/neet')).body.subjects.map((s: any) => s.slug)).toContain('biology');
  });
  it('404s unknown exams, subjects and chapters', async () => {
    expect((await request(app).get('/api/exams/nope')).status).toBe(404);
    expect((await request(app).get('/api/exams/jee-main/subjects/biology')).status).toBe(404);
    expect((await request(app).get('/api/exams/jee-main/subjects/physics/chapters/nope')).status).toBe(404);
  });
});

describe('chapter pages', () => {
  const base = '/api/exams/jee-advanced/subjects/chemistry/chapters';
  it('returns stats with disclosed denominators', async () => {
    const r = await request(app).get(`${base}/chemical-kinetics`);
    expect(r.body.stats).toMatchObject({ total: 2, pyqCount: 0, sampleCount: 2, paperCount: 1, subject_total: 4, weightage: 0.5 });
    expect(r.body.stats.byYear).toEqual([]);
    expect(r.body.questions[0].passage.body).toContain('first-order');
  });
  it('filters actually change the result set', async () => {
    const all = await request(app).get('/api/exams/jee-main/subjects/physics/chapters/current-electricity');
    expect(all.body.total).toBe(1);
    const none = await request(app).get('/api/exams/jee-main/subjects/physics/chapters/current-electricity?type=mcq_single');
    expect(none.body.total).toBe(0);
    const pyq = await request(app).get('/api/exams/jee-main/subjects/physics/chapters/current-electricity?source=pyq');
    expect(pyq.body.total).toBe(0);
    const topic = await request(app).get('/api/exams/jee-main/subjects/physics/chapters/laws-of-motion?topic=inclined-plane');
    expect(topic.body.total).toBe(1);
  });
  it('validates query params and pages', async () => {
    expect((await request(app).get(`${base}/chemical-kinetics?type=essay`)).status).toBe(400);
    expect((await request(app).get(`${base}/chemical-kinetics?page=9`)).status).toBe(404);
  });
  it('provides related chapter navigation', async () => {
    const r = await request(app).get(`${base}/chemical-kinetics`);
    expect(r.body.prev_chapter.slug).toBe('electrochemistry');
    expect(r.body.next_chapter.slug).toBe('surface-chemistry');
  });
});

describe('papers and questions', () => {
  it('paper list separates past papers (metadata only) from samples', async () => {
    const r = await request(app).get('/api/exams/jee-main/papers');
    expect(r.body.years[0].year).toBe(2024);
    expect(r.body.years[0].papers.every((p: any) => p.availability === 'metadata_only' && Number(p.question_count) === 0)).toBe(true);
    expect(r.body.samples[0].question_count).toBe(18);
  });
  it('paper detail preserves ordering, numbering and sections', async () => {
    const list = await request(app).get('/api/exams/jee-main/papers');
    const r = await request(app).get(`/api/papers/${list.body.samples[0].public_id}`);
    expect(r.body.items.map((i: any) => i.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(r.body.items[0].section).toBe('physics');
    expect(r.body.items[17].section).toBe('mathematics');
    expect(r.body.paper.sections).toHaveLength(3);
  });
  it('question detail supports chapter and paper context with prev/next', async () => {
    const list = await request(app).get('/api/exams/jee-main/papers');
    const paper = await request(app).get(`/api/papers/${list.body.samples[0].public_id}`);
    const q2 = paper.body.items[1].question.public_id;
    const ctxPaper = await request(app).get(`/api/questions/${q2}?ctx=paper&paper=${list.body.samples[0].public_id}`);
    expect(ctxPaper.body.context).toMatchObject({ kind: 'paper', number: 2, total: 18, prev: paper.body.items[0].question.public_id, next: paper.body.items[2].question.public_id });
    const ctxCh = await request(app).get(`/api/questions/${q2}`);
    expect(ctxCh.body.context.kind).toBe('chapter');
  });
  it('exposes answer-key correction history', async () => {
    const s = await request(app).get('/api/search?q=K4');
    const pid = s.body.results.find((q: any) => q.chapter.slug === 'coordination-compounds').public_id;
    const r = await request(app).get(`/api/questions/${pid}`);
    expect(r.body.question.answer).toMatchObject({ status: 'revised', version: 2, value: { options: ['A'] }, source: 'editorial' });
    expect(r.body.question.answer_history).toHaveLength(2);
  });
  it('404 for unknown question', async () => {
    expect((await request(app).get('/api/questions/zzzzzzzz')).status).toBe(404);
  });
});

describe('search', () => {
  it('finds question text, chapters and supports facets', async () => {
    const r = await request(app).get('/api/search?q=sphere');
    expect(r.body.total).toBeGreaterThan(0);
    expect(r.body.facets.exams[0]).toHaveProperty('count');
    const ch = await request(app).get('/api/search?q=Thermodynamics');
    expect(ch.body.chapter_hits.length).toBeGreaterThan(0);
  });
  it('filters change counts and empty results are clean', async () => {
    const all = await request(app).get('/api/search');
    const neet = await request(app).get('/api/search?exam=neet');
    const neetBio = await request(app).get('/api/search?exam=neet&subject=biology');
    expect(all.body.total).toBe(78);
    expect(neet.body.total).toBe(12);
    expect(neetBio.body.total).toBe(6);
    expect(neet.body.facets.subjects.length).toBe(3);
    const nothing = await request(app).get('/api/search?q=qwertyuiopzzz');
    expect(nothing.body).toMatchObject({ total: 0, results: [] });
  });
  it('paginates', async () => {
    const p2 = await request(app).get('/api/search?page=2');
    expect(p2.body.page).toBe(2);
    expect(p2.body.results).toHaveLength(20);
    expect(p2.body.pages).toBe(4);
  });
  it('rejects invalid filters', async () => {
    expect((await request(app).get('/api/search?type=bogus')).status).toBe(400);
  });
});

describe('tests and scoring', () => {
  it('paper test payload contains no answers or solutions', async () => {
    const list = await request(app).get('/api/exams/neet/papers');
    const r = await request(app).get(`/api/tests/paper/${list.body.samples[0].public_id}`);
    expect(r.status).toBe(200);
    expect(r.body.items[0].question.answer).toBeUndefined();
    expect(r.body.items[0].question.solutions).toBeUndefined();
  });
  it('metadata-only papers cannot be attempted', async () => {
    const list = await request(app).get('/api/exams/neet/papers');
    expect((await request(app).get(`/api/tests/paper/${list.body.years[0].papers[0].public_id}`)).status).toBe(409);
  });
  it('custom tests are deterministic per seed', async () => {
    const u = '/api/tests/custom?exam=jee-main&chapters=physics/laws-of-motion,chemistry/solutions,mathematics/probability&n=2&seed=abc';
    const a = await request(app).get(u);
    const b = await request(app).get(u);
    expect(a.body.items.map((i: any) => i.question.public_id)).toEqual(b.body.items.map((i: any) => i.question.public_id));
    expect(a.body.items).toHaveLength(2);
    expect((await request(app).get('/api/tests/custom?exam=jee-main&chapters=physics/waves')).status).toBe(409);
  });
  it('scores with the exam marking scheme including partial marks', async () => {
    const list = await request(app).get('/api/exams/jee-advanced/papers');
    const pid = list.body.samples[0].public_id;
    const paper = await request(app).get(`/api/papers/${pid}`);
    const multi = paper.body.items.find((i: any) => i.question.type === 'mcq_multi' && i.question.answer.value.options.length === 3).question;
    const single = paper.body.items.find((i: any) => i.question.type === 'mcq_single').question;
    const responses = { [multi.public_id]: { options: multi.answer.value.options.slice(0, 2) }, [single.public_id]: { options: ['D'] } };
    const r = await request(app).post('/api/tests/score').set(J).send({ exam: 'jee-advanced', paper: pid, questions: paper.body.items.map((i: any) => i.question.public_id), responses });
    expect(r.status).toBe(200);
    expect(r.body.summary).toMatchObject({ partial: 1, wrong: 1, correct: 0 });
    expect(r.body.total).toBe(2 - 1);
    expect(r.body.max).toBeGreaterThan(0);
  });
});

describe('accounts and student data', () => {
  it('auth boundary: account endpoints need sign-in, public content does not', async () => {
    expect((await request(app).get('/api/me/bookmarks')).status).toBe(401);
    expect((await request(app).get('/api/exams/jee-main')).status).toBe(200);
  });
  it('register / login / duplicate / wrong password', async () => {
    const { email } = await registerStudent();
    const dup = await request(app).post('/api/auth/register').set(J).send({ email, password: 'student-pass-1', display_name: 'x' });
    expect(dup.status).toBe(409);
    expect((await request(app).post('/api/auth/login').set(J).send({ email, password: 'wrong-password' })).status).toBe(401);
    expect((await request(app).post('/api/auth/register').set(J).send({ email: 'bad', password: '1' })).status).toBe(400);
  });
  it('bookmarks, recent views, practice, progress, revision, export, delete', async () => {
    const { agent } = await registerStudent();
    const qs = (await request(app).get('/api/search?exam=neet')).body.results;
    const q = qs.find((x: any) => x.type === 'mcq_single');
    expect((await agent.put(`/api/me/bookmarks/${q.public_id}`).set(J).send({})).status).toBe(200);
    expect((await agent.get('/api/me/bookmarks')).body.bookmarks).toHaveLength(1);
    expect((await agent.get('/api/me/bookmark-ids')).body.ids).toEqual([q.public_id]);
    await agent.delete(`/api/me/bookmarks/${q.public_id}`);
    expect((await agent.get('/api/me/bookmarks')).body.bookmarks).toHaveLength(0);

    await agent.post(`/api/me/recent/${q.public_id}`).set(J).send({});
    expect((await agent.get('/api/me/recent')).body.recent[0].public_id).toBe(q.public_id);

    const wrongOpt = ['A', 'B', 'C', 'D'].find((l) => !q.answer.value.options.includes(l));
    const w = await agent.post(`/api/me/practice/${q.public_id}`).set(J).send({ response: { options: [wrongOpt] } });
    expect(w.body.is_correct).toBe(false);
    expect((await agent.get('/api/me/wrong')).body.questions.map((x: any) => x.public_id)).toContain(q.public_id);
    const c = await agent.post(`/api/me/practice/${q.public_id}`).set(J).send({ response: { options: q.answer.value.options } });
    expect(c.body.is_correct).toBe(true);
    expect((await agent.get('/api/me/wrong')).body.questions.map((x: any) => x.public_id)).not.toContain(q.public_id);
    const prog = await agent.get('/api/me/progress');
    expect(prog.body.chapters[0]).toMatchObject({ attempted: 1, correct: 1 });
    expect((await agent.get('/api/me/practice-state')).body.state[q.public_id].is_correct).toBe(true);
    const reset = await agent.delete('/api/me/practice').set(J).send({ exam: 'neet', subject: q.subject.slug, chapter: q.chapter.slug });
    expect(reset.body.deleted).toBe(2);

    expect((await agent.put('/api/me/preferences').set(J).send({ theme: 'dark' })).body.preferences.theme).toBe('dark');
    expect((await agent.put('/api/me/preferences').set(J).send({ evil: 1 })).status).toBe(400);
    const exp = await agent.get('/api/me/export');
    expect(exp.headers['content-disposition']).toContain('attachment');
    expect(exp.body).toHaveProperty('practice_responses');

    expect((await agent.delete('/api/me').set(J).send({ password: 'nope', confirm: 'DELETE' })).status).toBe(401);
    expect((await agent.delete('/api/me').set(J).send({ password: 'student-pass-1', confirm: 'DELETE' })).status).toBe(200);
    expect((await agent.get('/api/auth/me')).body.user).toBeNull();
  });
  it('persisted attempts: start, autosave, resume, submit, isolation', async () => {
    const { agent } = await registerStudent();
    const list = await request(app).get('/api/exams/kcet/papers');
    const pid = list.body.samples[0].public_id;
    const start = await agent.post('/api/attempts').set(J).send({ kind: 'paper_test', paper: pid });
    expect(start.body.resumed).toBe(false);
    const again = await agent.post('/api/attempts').set(J).send({ kind: 'paper_test', paper: pid });
    expect(again.body).toMatchObject({ public_id: start.body.public_id, resumed: true });
    const paper = await request(app).get(`/api/papers/${pid}`);
    const items = paper.body.items.map((i: any) => i.question);
    const answers = items.map((q: any) => ({ question: q.public_id, response: { options: q.answer.value.options }, marked: false, time: 5 }));
    expect((await agent.put(`/api/attempts/${start.body.public_id}`).set(J).send({ state: { current: 2 }, answers: answers.slice(0, 1) })).status).toBe(200);
    const saved = await agent.get(`/api/attempts/${start.body.public_id}`);
    expect(saved.body.answers).toHaveLength(1);
    expect(saved.body.attempt.state.current).toBe(2);

    const other = await registerStudent();
    expect((await other.agent.get(`/api/attempts/${start.body.public_id}`)).status).toBe(404);

    const sub = await agent.post(`/api/attempts/${start.body.public_id}/submit`).set(J).send({ exam: 'kcet', questions: items.map((q: any) => q.public_id), state: {}, answers, duration_seconds: 60 });
    expect(sub.status).toBe(200);
    expect(sub.body.total).toBe(sub.body.max);
    expect((await agent.post(`/api/attempts/${start.body.public_id}/submit`).set(J).send({ exam: 'kcet', questions: ['x'], state: {}, answers: [], duration_seconds: 1 })).status).toBe(409);
    const hist = await agent.get('/api/me/attempts');
    expect(hist.body.attempts[0]).toMatchObject({ status: 'submitted', score: sub.body.total });
  });
  it('anyone can report a question', async () => {
    const q = (await request(app).get('/api/search?exam=wbjee')).body.results[0];
    const r = await request(app).post('/api/reports').set(J).send({ question: q.public_id, reason: 'typo', details: 'test' });
    expect(r.body.status).toBe('open');
  });
});

describe('admin & content management', () => {
  it('requires editor role', async () => {
    expect((await request(app).get('/api/admin/summary')).status).toBe(401);
    const { agent } = await registerStudent();
    expect((await agent.get('/api/admin/summary')).status).toBe(403);
  });

  it('import validation catches taxonomy, provenance, formula, diagram and duplicate problems', async () => {
    const admin = await login('admin@test.local', 'admin-test-password');
    const bad = {
      format_version: 1,
      source: { source_type: 'original_sample', title: 'Bad batch', license: 'x license', permission_note: 'testing validation rules' },
      questions: [
        { ref: 'bad.1', exam: 'jee-main', subject: 'physics', chapter: 'no-such-chapter', type: 'mcq_single', body: 'Body text', options: [{ label: 'A', body: 'a' }, { label: 'B', body: 'b' }], answer: { value: { options: ['A'] }, status: 'final', source: 'editorial' } },
        { ref: 'bad.2', exam: 'jee-main', subject: 'physics', chapter: 'waves', type: 'mcq_single', is_pyq: true, body: 'Broken $\\frac{1}{$ formula ![x](diagram:nope)', options: [{ label: 'A', body: 'a' }, { label: 'B', body: 'b' }], answer: { value: { options: ['C'] }, status: 'final', source: 'official' } },
        { ref: 'bad.3', exam: 'jee-main', subject: 'physics', chapter: 'waves', type: 'numerical', body: 'Numeric question', options: [{ label: 'A', body: 'a' }], answer: { value: { options: ['A'] }, status: 'final', source: 'editorial' } },
        { ref: 'dup.1', exam: 'jee-main', subject: 'physics', chapter: 'waves', type: 'mcq_single', body: 'The physical quantity having the same dimensional formula as Planck\'s constant $h$ is', options: [{ label: 'A', body: 'linear momentum' }, { label: 'B', body: 'angular momentum' }, { label: 'C', body: 'energy' }, { label: 'D', body: 'power' }], answer: { value: { options: ['B'] }, status: 'final', source: 'editorial' } },
      ],
    };
    const r = await admin.post('/api/admin/imports/validate').set(J).send({ format: 'json', content: JSON.stringify(bad), filename: 'bad.json' });
    expect(r.status).toBe(200);
    expect(r.body.report.ok).toBe(false);
    const msgs = r.body.report.errors.map((e: any) => e.message).join('\n');
    expect(msgs).toMatch(/unknown chapter "no-such-chapter"/);
    expect(msgs).toMatch(/cannot supply past-year questions/);
    expect(msgs).toMatch(/past-year questions must be linked to a past paper/);
    expect(msgs).toMatch(/only official or licensed sources may label/);
    expect(msgs).toMatch(/answer option "C" is not among the options/);
    expect(msgs).toMatch(/formula failed to render/);
    expect(msgs).toMatch(/unknown diagram "nope"/);
    expect(msgs).toMatch(/numerical questions must not have options/);
    expect(r.body.report.duplicates[0].ref).toBe('dup.1');
    expect((await admin.post(`/api/admin/imports/${r.body.batch_id}/commit`).set(J).send({})).status).toBe(409);
    expect((await admin.post('/api/admin/imports/validate').set(J).send({ format: 'json', content: '{oops' })).body.report.errors[0].message).toMatch(/Invalid JSON/);
  });

  let importedPid = '';
  it('commits a licensed past-paper import, updates stats/coverage, then rolls back safely', async () => {
    const admin = await login('admin@test.local', 'admin-test-password');
    const file = {
      format_version: 1,
      source: { source_type: 'test_fixture', title: 'Integration fixture (not real content)', license: 'test only', permission_note: 'Synthetic fixture created by the test suite.' },
      papers: [{ ref: 'fixture.paper.2099', exam: 'jee-main', title: 'Fixture Paper 2099', kind: 'test_fixture', year: 2099, sections: [], availability: 'full' }],
      questions: [
        { ref: 'fixture.q1', exam: 'jee-main', subject: 'physics', chapter: 'waves', type: 'mcq_single', status: 'published', body: 'Fixture question about $\\lambda$', options: [{ label: 'A', body: 'one' }, { label: 'B', body: 'two' }], answer: { value: { options: ['A'] }, status: 'final', source: 'editorial' }, papers: [{ paper: 'fixture.paper.2099', number: 1 }] },
      ],
    };
    const v = await admin.post('/api/admin/imports/validate').set(J).send({ format: 'json', content: JSON.stringify(file) });
    expect(v.body.report.ok).toBe(true);
    expect(v.body.preview[0].ref).toBe('fixture.q1');
    const c = await admin.post(`/api/admin/imports/${v.body.batch_id}/commit`).set(J).send({});
    expect(c.status).toBe(200);
    const ch = await request(app).get('/api/exams/jee-main/subjects/physics/chapters/waves');
    expect(ch.body.total).toBe(1);
    importedPid = ch.body.questions[0].public_id;
    // re-importing the same ref is refused
    const again = await admin.post('/api/admin/imports/validate').set(J).send({ format: 'json', content: JSON.stringify(file) });
    expect(again.body.report.errors.map((e: any) => e.message).join()).toMatch(/already imported/);

    const rb = await admin.post(`/api/admin/imports/${v.body.batch_id}/rollback`).set(J).send({});
    expect(rb.body.archived).toBe(1);
    expect((await request(app).get('/api/exams/jee-main/subjects/physics/chapters/waves')).body.total).toBe(0);
    expect((await admin.post(`/api/admin/imports/${v.body.batch_id}/rollback`).set(J).send({})).status).toBe(409);
    const audit = await admin.get('/api/admin/audit');
    expect(audit.body.entries.map((e: any) => e.action)).toEqual(expect.arrayContaining(['import.commit', 'import.rollback']));
  });

  it('CSV import needs provenance and validates rows', async () => {
    const admin = await login('admin@test.local', 'admin-test-password');
    const csv = 'ref,exam,subject,chapter,type,body,option_a,option_b,answer,status\ncsv.1,neet,biology,evolution,mcq_single,"A question about evolution",yes,no,A,published';
    expect((await admin.post('/api/admin/imports/validate').set(J).send({ format: 'csv', content: csv })).status).toBe(400);
    const v = await admin.post('/api/admin/imports/validate').set(J).send({ format: 'csv', content: csv, source: { source_type: 'licensed_dataset', title: 'CSV licensed set', license: 'Licensed', permission_note: 'Permission granted by rights holder (test).' } });
    expect(v.body.report.ok).toBe(true);
    expect((await admin.post(`/api/admin/imports/${v.body.batch_id}/commit`).set(J).send({})).status).toBe(200);
    expect((await request(app).get('/api/exams/neet/subjects/biology/chapters/evolution')).body.total).toBe(1);
  });

  it('edits create revisions; answer keys are versioned; restore works; publish needs a key', async () => {
    const admin = await login('admin@test.local', 'admin-test-password');
    const q = (await request(app).get('/api/search?exam=ojee&subject=mathematics')).body.results[0];
    const d = await admin.get(`/api/admin/questions/${q.public_id}`);
    const s = d.body.question;
    const edit = {
      subject: s.subject.slug, chapter: s.chapter.slug, type: s.type, body: s.body + ' (edited)', options: s.options, marks: null, negative_marks: null, difficulty: s.difficulty,
      topics: [], status: 'published', verification_status: 'verified', is_pyq: false, solutions: s.solutions.map((x: any) => ({ kind: x.kind, body: x.body, is_verified: x.is_verified })), change_note: 'Typo fix',
    };
    expect((await admin.put(`/api/admin/questions/${q.public_id}`).set(J).send(edit)).status).toBe(200);
    expect((await admin.put(`/api/admin/questions/${q.public_id}`).set(J).send({ ...edit, solutions: [{ kind: 'official', body: 'x', is_verified: false }] })).status).toBe(400);
    expect((await admin.put(`/api/admin/questions/${q.public_id}`).set(J).send({ ...edit, body: 'Bad $\\frac{$ math' })).body.details[0].message).toMatch(/Formula error/);
    const after = await request(app).get(`/api/questions/${q.public_id}`);
    expect(after.body.question.body).toContain('(edited)');
    expect(after.body.question.verification_status).toBe('verified');

    expect((await admin.post(`/api/admin/questions/${q.public_id}/answer-keys`).set(J).send({ value: { options: ['A'] }, status: 'disputed', source: 'editorial', note: 'Under review' })).status).toBe(200);
    expect((await admin.post(`/api/admin/questions/${q.public_id}/answer-keys`).set(J).send({ value: { numeric: 1 }, status: 'final', source: 'editorial' })).status).toBe(400);
    expect((await admin.post(`/api/admin/questions/${q.public_id}/answer-keys`).set(J).send({ value: { options: ['A'] }, status: 'final', source: 'official' })).status).toBe(400);
    const keyed = await request(app).get(`/api/questions/${q.public_id}`);
    expect(keyed.body.question.answer).toMatchObject({ status: 'disputed', version: 2 });

    const revs = (await admin.get(`/api/admin/questions/${q.public_id}`)).body.revisions;
    expect(revs.length).toBeGreaterThanOrEqual(3);
    expect((await admin.post(`/api/admin/questions/${q.public_id}/revisions/1/restore`).set(J).send({})).status).toBe(200);
    expect((await request(app).get(`/api/questions/${q.public_id}`)).body.question.body).not.toContain('(edited)');

    // create a draft via the admin API and publish it
    const sources = (await admin.get('/api/admin/sources')).body.sources;
    const created = await admin.post('/api/admin/questions').set(J).send({
      exam: 'ojee', source_record_id: sources.find((x: any) => x.source_type === 'original_sample').id, subject: 'physics', chapter: 'waves', type: 'numerical',
      body: 'A brand new numerical question about $v = f\\lambda$', options: [], topics: ['wave-speed'], status: 'draft', verification_status: 'unverified', solutions: [],
      answer: { value: { numeric: 340 }, status: 'final', source: 'editorial' }, change_note: 'Created in test',
    });
    expect(created.status).toBe(200);
    expect((await request(app).get(`/api/questions/${created.body.public_id}`)).status).toBe(404);
    expect((await admin.post(`/api/admin/questions/${created.body.public_id}/status`).set(J).send({ status: 'published' })).status).toBe(200);
    expect((await request(app).get(`/api/questions/${created.body.public_id}`)).status).toBe(200);
  });

  it('report workflow flags questions for correction', async () => {
    const admin = await login('admin@test.local', 'admin-test-password');
    const reports = (await admin.get('/api/admin/reports')).body.reports;
    expect(reports.length).toBeGreaterThan(0);
    expect((await admin.patch(`/api/admin/reports/${reports[0].id}`).set(J).send({ status: 'accepted', flag_question: true })).status).toBe(200);
    const q = await admin.get(`/api/admin/questions/${reports[0].question}`);
    expect(q.body.question.verification_status).toBe('needs_correction');
  });

  it('diagram upload rejects active SVG content and accepts clean SVG', async () => {
    const admin = await login('admin@test.local', 'admin-test-password');
    const evil = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
    expect((await admin.post('/api/admin/diagrams').set(J).send({ data_base64: evil, mime: 'image/svg+xml', alt_text: 'An evil diagram here', license: 'test' })).status).toBe(400);
    const ok = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>').toString('base64');
    const r = await admin.post('/api/admin/diagrams').set(J).send({ data_base64: ok, mime: 'image/svg+xml', alt_text: 'A filled black square', license: 'test' });
    expect(r.status).toBe(200);
    expect(r.body.markup).toContain('diagram:up-');
    expect((await request(app).get(r.body.url)).status).toBe(200);
  });

  it('taxonomy management and syllabus mapping', async () => {
    const admin = await login('admin@test.local', 'admin-test-password');
    const tax = (await admin.get('/api/admin/taxonomy')).body;
    const physics = tax.subjects.find((s: any) => s.exam_id === tax.exams.find((e: any) => e.slug === 'keam').id && s.slug === 'physics');
    expect((await admin.post(`/api/admin/subjects/${physics.id}/chapters`).set(J).send({ slug: 'test-chapter', name: 'Test Chapter', unit_name: 'Mechanics' })).status).toBe(200);
    expect((await admin.post(`/api/admin/subjects/${physics.id}/chapters`).set(J).send({ slug: 'test-chapter', name: 'Dup' })).status).toBe(409);
    expect((await request(app).get('/api/exams/keam/subjects/physics/chapters/test-chapter')).status).toBe(200);
  });
});

describe('platform security & routing', () => {
  it('sets security headers', async () => {
    const r = await request(app).get('/api/health');
    expect(r.headers['content-security-policy']).toContain("default-src 'self'");
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-powered-by']).toBeUndefined();
  });
  it('rejects cross-origin and non-JSON mutations', async () => {
    expect((await request(app).post('/api/reports').set('Origin', 'https://evil.example').set(J).send({})).status).toBe(403);
    expect((await request(app).post('/api/auth/login').set('Content-Type', 'text/plain').send('email=x')).status).toBe(415);
  });
  it('unknown API routes 404 as JSON', async () => {
    const r = await request(app).get('/api/nope');
    expect(r.status).toBe(404);
    expect(r.body.error).toBe('Not found');
  });
  it('deep links return 200 and unknown routes return 404 (SPA shell)', async () => {
    expect((await request(app).get('/past-years/jee/jee-main/physics/laws-of-motion')).status).toBe(200);
    expect((await request(app).get('/past-years/medical/neet')).status).toBe(200);
    expect((await request(app).get('/past-years/jee/jee-main/physics/not-a-chapter')).status).toBe(404);
    expect((await request(app).get('/past-years/jee/neet')).status).toBe(404);
    expect((await request(app).get('/totally/unknown')).status).toBe(404);
  });
  it('PDF endpoint only renders whitelisted print paths', async () => {
    expect((await request(app).get('/api/pdf?path=https://evil.example')).status).toBe(400);
    expect((await request(app).get('/api/pdf?path=/admin')).status).toBe(400);
  });
});
