import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { formatAnswer } from '../../shared/scoring';
import type { Response } from '../../shared/types';
import { AnswerBox } from '../components/AnswerPanel';
import { Content } from '../components/Content';
import { Matrix, NUMERIC_TYPES } from '../components/QuestionCard';
import { Empty, ErrorState, Loading } from '../components/States';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDuration, questionPath } from '../lib/format';
import { useHead } from '../lib/head';
import type { Question } from '../lib/types';
import { MarkingSchemeTable } from './PaperPage';

interface Item { number: number; section: string | null; question: Question }
interface TestDef { paper: any; exam: { slug: string; name: string }; items: Item[]; definition?: any }
interface Saved { started: number; responses: Record<string, Response>; marked: string[]; visited: string[]; current: number; time: Record<string, number>; attempt?: string }

const store = {
  get(k: string): Saved | null { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } },
  set(k: string, v: Saved) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable: server autosave still works for signed-in users */ } },
  del(k: string) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

type Status = 'not-visited' | 'not-answered' | 'answered' | 'marked' | 'answered-marked';
const answered = (r: Response | undefined) => !!r && ('options' in r ? r.options.length > 0 : Number.isFinite(r.value));

export function TestPage({ mode }: { mode: 'paper' | 'custom' | 'review' }) {
  const { paperId, attemptId } = useParams();
  const loc = useLocation();
  const { user, ready } = useAuth();
  const [def, setDef] = useState<TestDef | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [review, setReview] = useState<any>(null);
  const [resumeAttempt, setResumeAttempt] = useState<any>(null);
  useHead(def ? `${def.paper.title} – test` : 'Test', { noindex: true });

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        if (mode === 'paper') setDef(await api.get(`/api/tests/paper/${paperId}`));
        else if (mode === 'custom') setDef(await api.get(`/api/tests/custom${loc.search}`));
        else {
          const a = await api.get<any>(`/api/attempts/${attemptId}`);
          const at = a.attempt;
          if (at.status === 'submitted') {
            const responses = Object.fromEntries(a.answers.map((x: any) => [x.public_id, x.response]));
            const qsList = at.definition.questions ?? a.answers.map((x: any) => x.public_id);
            const scored = await api.post('/api/tests/score', { exam: at.definition.exam, paper: at.paper, questions: qsList, responses });
            setReview({ ...scored, title: at.paper ? 'Paper test' : 'Custom test', attempt: at });
          } else {
            setResumeAttempt(a);
            const d = at.paper ? await api.get(`/api/tests/paper/${at.paper}`) : await api.get(`/api/tests/custom?${new URLSearchParams(at.definition).toString()}`);
            setDef(d);
          }
        }
      } catch (e) {
        setError(e as ApiError);
      }
    })();
  }, [mode, paperId, attemptId, loc.search, ready]);

  if (error) return error.status === 401 ? <Empty title="Sign in to view this attempt"><Link className="btn" to={`/login?next=${encodeURIComponent(loc.pathname)}`}>Sign in</Link></Empty> : <ErrorState error={error} />;
  if (review) return <Results result={review} title={review.title} />;
  if (!def) return <Loading lines={6} />;
  const storageKey = `pl-test:${mode === 'paper' ? paperId : resumeAttempt ? 'attempt:' + attemptId : loc.search}`;
  return <Engine def={def} storageKey={storageKey} signedIn={!!user} resumeAttempt={resumeAttempt} />;
}

function Engine({ def, storageKey, signedIn, resumeAttempt }: { def: TestDef; storageKey: string; signedIn: boolean; resumeAttempt: any }) {
  const items = def.items;
  const durationSec = (def.paper.duration_minutes ?? Math.max(5, Math.round(items.length * 2.5))) * 60;
  const saved = useRef<Saved | null>(store.get(storageKey));
  const [phase, setPhase] = useState<'intro' | 'running' | 'done'>(saved.current ? 'running' : 'intro');
  const [s, setS] = useState<Saved>(saved.current ?? { started: 0, responses: {}, marked: [], visited: [], current: 0, time: {} });
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [saveState, setSaveState] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lastTick = useRef(Date.now());
  const submitting = useRef(false);
  const nav = useNavigate();

  // restore a server-side in-progress attempt (cross-device resume)
  useEffect(() => {
    if (!resumeAttempt || saved.current) return;
    const at = resumeAttempt.attempt;
    const responses = Object.fromEntries(resumeAttempt.answers.map((a: any) => [a.public_id, a.response]));
    const marked = resumeAttempt.answers.filter((a: any) => a.marked_for_review).map((a: any) => a.public_id);
    setS({ started: new Date(at.started_at).getTime(), responses, marked, visited: at.state?.visited ?? Object.keys(responses), current: at.state?.current ?? 0, time: {}, attempt: at.public_id });
    setPhase('running');
  }, [resumeAttempt]);

  const remaining = phase === 'running' ? Math.max(0, Math.round((s.started + durationSec * 1000 - now) / 1000)) : durationSec;
  const cur = items[s.current];

  // persist locally on every change
  useEffect(() => {
    if (phase === 'running') store.set(storageKey, s);
  }, [s, phase, storageKey]);

  // clock + per-question time
  useEffect(() => {
    if (phase !== 'running') return;
    const t = setInterval(() => {
      const n = Date.now();
      const dt = Math.round((n - lastTick.current) / 1000);
      if (dt >= 1) {
        lastTick.current = n;
        setNow(n);
        setS((p) => ({ ...p, time: { ...p.time, [items[p.current].question.public_id]: (p.time[items[p.current].question.public_id] ?? 0) + dt } }));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [phase, items]);

  const answersPayload = useCallback(
    (st: Saved) => items.map((i) => ({ question: i.question.public_id, response: st.responses[i.question.public_id] ?? null, marked: st.marked.includes(i.question.public_id), time: st.time[i.question.public_id] ?? 0 })),
    [items],
  );

  // server autosave for signed-in users: debounced on answer changes, plus a periodic flush for time spent.
  // (Keyed on answers, not on `s`, because the clock updates `s` every second.)
  const latest = useRef(s);
  latest.current = s;
  const flush = useCallback(async () => {
    const st = latest.current;
    if (!st.attempt) return;
    try {
      await api.put(`/api/attempts/${st.attempt}`, { state: { current: st.current, visited: st.visited }, answers: answersPayload(st) });
      setSaveState(`Saved ${new Date().toLocaleTimeString()}`);
    } catch {
      setSaveState('Offline — answers kept on this device');
    }
  }, [answersPayload]);
  useEffect(() => {
    if (phase !== 'running' || !signedIn || !s.attempt) return;
    const t = setTimeout(flush, 1000);
    return () => clearTimeout(t);
  }, [s.responses, s.marked, s.current, s.attempt, phase, signedIn, flush]);
  useEffect(() => {
    if (phase !== 'running' || !signedIn) return;
    const t = setInterval(flush, 20000);
    return () => clearInterval(t);
  }, [phase, signedIn, flush]);

  const submit = useCallback(async () => {
    if (submitting.current) return;
    submitting.current = true;
    setConfirm(false);
    setSubmitError(null);
    const body = { exam: def.exam.slug, paper: def.paper.public_id, questions: items.map((i) => i.question.public_id), responses: s.responses };
    try {
      const r = s.attempt
        ? await api.post(`/api/attempts/${s.attempt}/submit`, { exam: def.exam.slug, questions: body.questions, state: { visited: s.visited }, answers: answersPayload(s), duration_seconds: Math.min(durationSec, Math.round((Date.now() - s.started) / 1000)) })
        : await api.post('/api/tests/score', body);
      store.del(storageKey);
      setResult(r);
      setPhase('done');
    } catch (e) {
      setSubmitError(`Submission failed: ${(e as ApiError).message}. Your answers are still saved; try again.`);
    } finally {
      submitting.current = false;
    }
  }, [def, items, s, storageKey, durationSec, answersPayload]);

  useEffect(() => {
    if (phase === 'running' && remaining === 0) submit();
  }, [remaining, phase, submit]);

  const begin = async () => {
    const st: Saved = { started: Date.now(), responses: {}, marked: [], visited: [items[0].question.public_id], current: 0, time: {} };
    if (signedIn) {
      try {
        const a = await api.post<{ public_id: string; resumed: boolean }>('/api/attempts', def.paper.public_id ? { kind: 'paper_test', paper: def.paper.public_id } : { kind: 'custom_test', definition: def.definition });
        if (a.resumed) return nav(`/test/attempt/${a.public_id}`);
        st.attempt = a.public_id;
      } catch {
        setSaveState('Could not create a saved attempt — answers will be kept on this device only.');
      }
    }
    lastTick.current = Date.now();
    setNow(Date.now());
    setS(st);
    setPhase('running');
  };

  const go = (i: number) => setS((p) => ({ ...p, current: i, visited: p.visited.includes(items[i].question.public_id) ? p.visited : [...p.visited, items[i].question.public_id] }));
  const setResp = (r: Response) => setS((p) => ({ ...p, responses: { ...p.responses, [cur.question.public_id]: r } }));
  const toggleMark = () => setS((p) => ({ ...p, marked: p.marked.includes(cur.question.public_id) ? p.marked.filter((x) => x !== cur.question.public_id) : [...p.marked, cur.question.public_id] }));
  const status = (pid: string): Status => {
    const a = answered(s.responses[pid]);
    const m = s.marked.includes(pid);
    if (a && m) return 'answered-marked';
    if (m) return 'marked';
    if (a) return 'answered';
    return s.visited.includes(pid) ? 'not-answered' : 'not-visited';
  };
  const counts = useMemo(() => {
    const c: Record<Status, number> = { 'not-visited': 0, 'not-answered': 0, answered: 0, marked: 0, 'answered-marked': 0 };
    for (const i of items) c[status(i.question.public_id)]++;
    return c;
  }, [s, items]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'done' && result) return <Results result={result} title={def.paper.title} />;

  if (phase === 'intro') {
    return (
      <div className="panel panel-pad" style={{ maxWidth: 760 }} data-testid="test-intro">
        <h1>{def.paper.title}</h1>
        <p className="badge" title="Timed test engine is a PrepLedger feature">PrepLedger test engine</p>
        {def.paper.kind === 'sample' && <p className="notice notice-warn small">Original sample set, not a past paper.</p>}
        <ul>
          <li>{items.length} questions · {Math.round(durationSec / 60)} minutes. The test submits automatically when time runs out.</li>
          <li>Use the palette to jump between questions. “Mark for review” flags a question; marked questions with an answer are still scored.</li>
          <li>Answers are saved on this device as you go{signedIn ? ' and to your account, so you can resume elsewhere' : '. Sign in to save attempts to your account'}.</li>
        </ul>
        <h2>Marking scheme</h2>
        <MarkingSchemeTable scheme={def.paper.marking_scheme} />
        <div className="legend" style={{ maxWidth: 420 }}>
          <span><i className="pal not-visited" /> Not visited</span><span><i className="pal not-answered" /> Not answered</span>
          <span><i className="pal answered" /> Answered</span><span><i className="pal marked" /> Marked for review</span>
          <span><i className="pal answered-marked" /> Answered &amp; marked</span>
        </div>
        <p style={{ marginTop: 14 }}><button className="btn btn-primary" onClick={begin} data-testid="start-test">Start test</button></p>
      </div>
    );
  }

  const q = cur.question;
  const resp = s.responses[q.public_id] ?? null;
  const multi = q.type === 'mcq_multi';
  const chosen = resp && 'options' in resp ? resp.options : [];
  return (
    <>
      <div className="test-top">
        <div className="row-between">
          <strong>{def.paper.title}</strong>
          <span className="row">
            <span className="small muted" aria-live="polite">{saveState}</span>
            <span className={`timer ${remaining < 300 ? 'low' : ''}`} role="timer" aria-label={`Time remaining ${fmtDuration(remaining)}`} data-testid="timer">{fmtDuration(remaining)}</span>
            <button className="btn btn-primary btn-sm" onClick={() => setConfirm(true)} data-testid="submit-test">Submit</button>
          </span>
        </div>
      </div>
      {submitError && <p className="notice notice-danger" role="alert">{submitError}</p>}
      <div className="test-shell">
        <section className="q-card" aria-labelledby="tq-head" data-testid="test-question">
          <header className="q-head">
            <span className="q-num" id="tq-head">Question {cur.number}</span>
            <span className="q-tags"><span className="badge">{q.type_label}</span>{cur.section && <span className="badge">{def.paper.sections?.find((x: any) => x.key === cur.section)?.name ?? q.subject.name}</span>}</span>
          </header>
          {q.passage && <div className="q-passage"><div className="label">{q.passage.title ?? 'Passage'}</div><Content src={q.passage.body} diagrams={q.diagrams} /></div>}
          <div className="q-body"><Content src={q.body} diagrams={q.diagrams} /></div>
          <Matrix q={q} />
          {q.options.length > 0 && (
            <ul className="options" role={multi ? 'group' : 'radiogroup'} aria-label="Options">
              {q.options.map((o) => (
                <li key={o.label}>
                  <button type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={chosen.includes(o.label)} className={`option ${chosen.includes(o.label) ? 'selected' : ''}`} data-option={o.label}
                    onClick={() => setResp({ options: multi ? (chosen.includes(o.label) ? chosen.filter((x) => x !== o.label) : [...chosen, o.label].sort()) : [o.label] })}>
                    <span className="opt-label">{o.label}</span><span className="opt-body"><Content as="span" src={o.body} diagrams={q.diagrams} /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {NUMERIC_TYPES.has(q.type) && (
            <div className="num-input">
              <label htmlFor="t-num" className="small muted">Your answer</label>
              <input id="t-num" type="number" step="any" inputMode="decimal" data-testid="numeric-input"
                value={resp && 'value' in resp ? String(resp.value) : ''}
                onChange={(e) => setResp(e.target.value === '' || !Number.isFinite(Number(e.target.value)) ? null : { value: Number(e.target.value) })} />
            </div>
          )}
          <div className="q-actions">
            <button className="btn btn-sm" disabled={s.current === 0} onClick={() => go(s.current - 1)}>‹ Previous</button>
            <button className="btn btn-sm" onClick={() => setResp(null)} disabled={!answered(resp ?? undefined)}>Clear response</button>
            <button className="btn btn-sm" onClick={() => { toggleMark(); if (s.current < items.length - 1) go(s.current + 1); }} data-testid="mark-review">{s.marked.includes(q.public_id) ? 'Unmark' : 'Mark for review'} &amp; next</button>
            <span className="spacer" />
            <button className="btn btn-primary btn-sm" onClick={() => (s.current < items.length - 1 ? go(s.current + 1) : setConfirm(true))} data-testid="save-next">{s.current < items.length - 1 ? 'Save & next ›' : 'Save & finish'}</button>
          </div>
        </section>
        <aside className="panel panel-pad" aria-label="Question palette">
          <h2>Questions</h2>
          <div className="palette" data-testid="palette">
            {items.map((it, i) => {
              const st = status(it.question.public_id);
              return <button key={it.question.public_id} className={`pal ${st} ${i === s.current ? 'current' : ''}`} onClick={() => go(i)} aria-label={`Question ${it.number}: ${st.replace('-', ' ')}`} aria-current={i === s.current ? 'step' : undefined}>{it.number}</button>;
            })}
          </div>
          <div className="legend">
            <span><i className="pal answered" /> Answered {counts.answered}</span>
            <span><i className="pal not-answered" /> Not answered {counts['not-answered']}</span>
            <span><i className="pal not-visited" /> Not visited {counts['not-visited']}</span>
            <span><i className="pal marked" /> Marked {counts.marked}</span>
            <span><i className="pal answered-marked" /> Ans. &amp; marked {counts['answered-marked']}</span>
          </div>
        </aside>
      </div>
      {confirm && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-h">
          <div className="dialog">
            <h2 id="confirm-h">Submit test?</h2>
            <p>Answered: {counts.answered + counts['answered-marked']} · Not answered: {counts['not-answered'] + counts.marked} · Not visited: {counts['not-visited']}</p>
            <p className="small muted">You cannot change answers after submitting.</p>
            <div className="row"><button className="btn btn-primary" onClick={submit} data-testid="confirm-submit">Submit now</button><button className="btn" onClick={() => setConfirm(false)}>Keep working</button></div>
          </div>
        </div>
      )}
    </>
  );
}

function Results({ result, title }: { result: any; title: string }) {
  const [filter, setFilter] = useState<'all' | 'wrong' | 'unattempted'>('all');
  const items = result.items.filter((i: any) => filter === 'all' || (filter === 'wrong' ? i.result.attempted && !i.result.correct : !i.result.attempted));
  return (
    <>
      <div className="page-title"><h1>Result: {title}</h1></div>
      <section className="panel panel-pad" data-testid="test-result">
        <div className="stat-grid">
          <div className="stat"><div className="v" data-testid="score">{result.total} / {result.max}</div><div className="l">Score</div></div>
          <div className="stat"><div className="v">{result.summary.correct}</div><div className="l">Correct</div></div>
          <div className="stat"><div className="v">{result.summary.partial}</div><div className="l">Partially correct</div></div>
          <div className="stat"><div className="v">{result.summary.wrong}</div><div className="l">Incorrect</div></div>
          <div className="stat"><div className="v">{result.summary.unattempted}</div><div className="l">Not attempted</div></div>
        </div>
        <div className="table-scroll" style={{ marginTop: 12 }}>
          <table className="data">
            <thead><tr><th>Section</th><th className="num">Score</th><th className="num">Attempted</th><th className="num">Correct</th></tr></thead>
            <tbody>{Object.entries(result.by_section).map(([k, v]: any) => <tr key={k}><td>{k}</td><td className="num">{v.score} / {v.max}</td><td className="num">{v.attempted} / {v.count}</td><td className="num">{v.correct}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="small muted">Scored with the current answer keys and marking scheme. Revised or dropped keys are applied automatically.</p>
      </section>
      <div className="tabs" role="tablist" style={{ marginTop: 14 }}>
        {(['all', 'wrong', 'unattempted'] as const).map((f) => <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All questions' : f === 'wrong' ? 'Incorrect' : 'Not attempted'}</button>)}
      </div>
      {items.map((it: any, idx: number) => <ReviewItem key={it.public_id} it={it} n={result.items.indexOf(it) + 1 || idx + 1} />)}
      <p className="row" style={{ marginTop: 14 }}><Link className="btn" to="/practice">More practice</Link><Link className="btn" to="/account/attempts">Test history</Link></p>
    </>
  );
}

function ReviewItem({ it, n }: { it: any; n: number }) {
  const q: Question = it.question;
  const chosen: string[] = it.response && 'options' in it.response ? it.response.options : [];
  const correct = new Set(q.answer && 'options' in q.answer.value ? q.answer.value.options : []);
  const r = it.result;
  const badge = !r.attempted ? <span className="badge">Not attempted</span> : r.correct ? <span className="badge badge-success">Correct</span> : r.partial ? <span className="badge badge-warn">Partial</span> : <span className="badge badge-danger">Incorrect</span>;
  return (
    <article className="q-card" data-testid="review-item">
      <header className="q-head"><span className="q-num">Question {n}</span><span className="q-tags">{badge}<span className="badge">{r.marks > 0 ? '+' : ''}{r.marks} marks</span></span></header>
      {q.passage && <div className="q-passage"><Content src={q.passage.body} diagrams={q.diagrams} /></div>}
      <div className="q-body"><Content src={q.body} diagrams={q.diagrams} /></div>
      <Matrix q={q} />
      {q.options.length > 0 && (
        <ul className="options">
          {q.options.map((o) => (
            <li key={o.label} className={`option ${correct.has(o.label) ? 'correct' : chosen.includes(o.label) ? 'wrong' : ''}`}>
              <span className="opt-label">{o.label}</span><span className="opt-body"><Content as="span" src={o.body} diagrams={q.diagrams} /></span>
              {chosen.includes(o.label) && <span className="small muted">your choice</span>}
            </li>
          ))}
        </ul>
      )}
      {NUMERIC_TYPES.has(q.type) && <p style={{ padding: '0 14px' }}>Your answer: <strong>{it.response && 'value' in it.response ? it.response.value : '—'}</strong>{q.answer && <> · Correct: <strong>{formatAnswer(q.answer.value)}</strong></>}</p>}
      <AnswerBox q={q} showSolutions />
      <div className="q-actions"><Link className="btn btn-sm" to={questionPath(q.public_id)}>Open question ›</Link></div>
    </article>
  );
}
