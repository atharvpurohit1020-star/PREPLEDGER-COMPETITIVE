import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Content } from '../components/Content';
import { QuestionCard } from '../components/QuestionCard';
import { Empty, ErrorState, Loading } from '../components/States';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { chapterPath, fmtDateTime, questionPath } from '../lib/format';
import { useHead } from '../lib/head';
import type { Question } from '../lib/types';
import { useApi } from '../lib/useApi';

const TABS = [
  ['dashboard', 'Dashboard'],
  ['bookmarks', 'Bookmarks'],
  ['recent', 'Recently viewed'],
  ['attempts', 'Test history'],
  ['revision', 'Wrong-answer revision'],
  ['settings', 'Settings & data'],
] as const;

function Dashboard() {
  const { data, error, loading, reload } = useApi<any>('/api/me/progress');
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data.chapters.length) return <Empty title="No practice yet"><p>Answer questions with “Check answer” on any chapter page and your progress will appear here.</p><Link className="btn" to="/">Browse exams</Link></Empty>;
  const totals = data.chapters.reduce((a: any, c: any) => ({ attempted: a.attempted + Number(c.attempted), correct: a.correct + Number(c.correct) }), { attempted: 0, correct: 0 });
  return (
    <div className="stack">
      <div className="stat-grid">
        <div className="stat"><div className="v">{totals.attempted}</div><div className="l">Questions practised</div></div>
        <div className="stat"><div className="v">{totals.attempted ? Math.round((totals.correct / totals.attempted) * 100) : 0}%</div><div className="l">Accuracy (latest answer per question)</div></div>
        <div className="stat"><div className="v">{data.tests.submitted}</div><div className="l">Tests submitted</div></div>
        <div className="stat"><div className="v">{data.tests.in_progress}</div><div className="l">Tests in progress</div></div>
      </div>
      <div className="table-scroll">
        <table className="data" data-testid="progress-table">
          <thead><tr><th>Exam</th><th>Chapter</th><th className="num">Practised</th><th className="num">Correct</th><th className="num">Coverage</th></tr></thead>
          <tbody>
            {data.chapters.map((c: any) => (
              <tr key={`${c.exam}-${c.subject}-${c.chapter}`}>
                <td>{c.exam_name}</td>
                <td><Link to={chapterPath(c.category, c.exam, c.subject, c.chapter)}>{c.chapter_name}</Link> <span className="muted small">{c.subject_name}</span></td>
                <td className="num">{c.attempted}</td><td className="num">{c.correct}</td>
                <td className="num">{c.total ? Math.round((c.attempted / c.total) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Bookmarks() {
  const { data, error, loading, reload } = useApi<any>('/api/me/bookmarks');
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data.bookmarks.length) return <Empty title="No bookmarks yet"><p>Use ☆ Bookmark on any question to save it here.</p></Empty>;
  return <>{data.bookmarks.map((b: any) => <QuestionCard key={b.question.public_id} q={b.question} />)}</>;
}

function Recent() {
  const { data, error, loading, reload } = useApi<any>('/api/me/recent');
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data.recent.length) return <Empty title="Nothing viewed yet"><p>Questions you open will be listed here.</p></Empty>;
  return (
    <ul className="side-list panel">
      {data.recent.map((r: any) => (
        <li key={r.public_id} style={{ borderBottom: '1px solid var(--line)' }}>
          <Link to={questionPath(r.public_id)} style={{ display: 'block' }}>
            <span className="small muted">{r.exam.name} · {r.chapter.name} · {fmtDateTime(r.viewed_at)}</span>
            <Content src={r.body.split('\n')[0].slice(0, 220)} diagrams={r.diagrams} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Attempts() {
  const { data, error, loading, reload } = useApi<any>('/api/me/attempts');
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data.attempts.length) return <Empty title="No tests taken yet"><Link className="btn" to="/practice">Start a practice test</Link></Empty>;
  return (
    <div className="table-scroll">
      <table className="data" data-testid="attempts-table">
        <thead><tr><th>Test</th><th>Started</th><th>Status</th><th className="num">Score</th><th /></tr></thead>
        <tbody>
          {data.attempts.map((a: any) => (
            <tr key={a.public_id}>
              <td>{a.paper_title ?? 'Custom test'}</td>
              <td>{fmtDateTime(a.started_at)}</td>
              <td>{a.status === 'submitted' ? 'Submitted' : 'In progress'}</td>
              <td className="num">{a.score != null ? `${a.score} / ${a.max_score}` : '—'}</td>
              <td>
                {a.status === 'submitted' ? <Link to={`/test/attempt/${a.public_id}`}>Review</Link> : a.paper ? <Link to={`/test/paper/${a.paper}`}>Resume</Link> : <Link to={`/test/attempt/${a.public_id}`}>Resume</Link>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Revision() {
  const { data, error, loading, reload } = useApi<{ questions: Question[] }>('/api/me/wrong');
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data!.questions.length) return <Empty title="Nothing to revise"><p>Questions you answer incorrectly in practice or tests will appear here until you get them right.</p></Empty>;
  return (
    <>
      <p className="small muted">{data!.questions.length} questions whose latest attempt was incorrect. Answer them again here; correct answers drop off the list next time.</p>
      {data!.questions.map((q) => <QuestionCard key={q.public_id} q={q} />)}
    </>
  );
}

function Settings() {
  const { user, setUser, refresh } = useAuth();
  const nav = useNavigate();
  const [msg, setMsg] = useState<string | null>(null);
  const [pw, setPw] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const prefs = user!.preferences ?? {};
  const save = async (patch: Record<string, string>) => {
    try {
      await api.put('/api/me/preferences', patch);
      await refresh();
      setMsg('Preferences saved.');
    } catch (e) {
      setMsg((e as ApiError).message);
    }
  };
  const del = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await api.del('/api/me', { password: pw, confirm: confirmText });
      setUser(null);
      nav('/');
    } catch (e2) {
      setErr((e2 as ApiError).message);
    }
  };
  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <section className="panel panel-pad">
        <h2>Preferences</h2>
        <label className="field"><span>Theme</span>
          <select value={prefs.theme ?? 'system'} onChange={(e) => save({ theme: e.target.value })}><option value="system">Follow system</option><option value="light">Light</option><option value="dark">Dark</option></select>
        </label>
        {msg && <p className="small" role="status">{msg}</p>}
      </section>
      <section className="panel panel-pad">
        <h2>Your data</h2>
        <p className="small">Download everything stored about you (bookmarks, history, attempts, reports) as JSON.</p>
        <a className="btn" href="/api/me/export" download data-testid="export-data">Export my data</a>
      </section>
      <form className="panel panel-pad" onSubmit={del}>
        <h2>Delete account</h2>
        <p className="small">Permanently deletes your account and all associated data. Public questions stay accessible without an account.</p>
        <label className="field"><span>Password</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="current-password" /></label>
        <label className="field"><span>Type DELETE to confirm</span><input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} required /></label>
        {err && <p className="errors" role="alert">{err}</p>}
        <button className="btn btn-danger" disabled={confirmText !== 'DELETE'}>Delete my account</button>
      </form>
    </div>
  );
}

export function AccountPage() {
  const { user, ready, setUser } = useAuth();
  const { tab = 'dashboard' } = useParams();
  useHead('My account', { noindex: true });
  if (!ready) return <Loading />;
  if (!user) return <Navigate to={`/login?next=/account${tab !== 'dashboard' ? '/' + tab : ''}`} replace />;
  const logout = async () => {
    await api.post('/api/auth/logout');
    setUser(null);
  };
  const Comp = { dashboard: Dashboard, bookmarks: Bookmarks, recent: Recent, attempts: Attempts, revision: Revision, settings: Settings }[tab as (typeof TABS)[number][0]];
  return (
    <>
      <div className="page-title">
        <h1>{user.display_name}</h1>
        <span className="row small muted">{user.email} <button className="btn btn-sm" onClick={logout}>Sign out</button></span>
      </div>
      <nav className="tabs" aria-label="Account sections">
        {TABS.map(([k, l]) => <Link key={k} to={k === 'dashboard' ? '/account' : `/account/${k}`} aria-current={tab === k ? 'page' : undefined}>{l}</Link>)}
      </nav>
      {Comp ? <Comp /> : <Empty title="Unknown section" />}
    </>
  );
}
