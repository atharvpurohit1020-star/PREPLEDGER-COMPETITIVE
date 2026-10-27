import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useExamList } from '../components/Layout';
import { ErrorState, Loading } from '../components/States';
import { qs } from '../lib/api';
import { paperPath } from '../lib/format';
import { useHead } from '../lib/head';
import { useApi } from '../lib/useApi';

export function PracticePage() {
  useHead('Practice tests');
  const [sp, setSp] = useSearchParams();
  const exam = sp.get('exam') ?? '';
  const exams = useExamList();
  const detail = useApi<any>(exam ? `/api/exams/${exam}` : null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [n, setN] = useState(10);
  const [minutes, setMinutes] = useState<string>('');
  const nav = useNavigate();
  const available = useMemo(() => {
    let total = 0;
    for (const s of detail.data?.subjects ?? []) for (const u of s.units) for (const c of u.chapters) if (picked.has(`${s.slug}/${c.slug}`)) total += c.question_count;
    return total;
  }, [picked, detail.data]);
  const toggle = (k: string) => setPicked((p) => { const x = new Set(p); x.has(k) ? x.delete(k) : x.add(k); return x; });
  const start = () => nav(`/test/custom${qs({ exam, chapters: [...picked].join(','), n: Math.min(n, available), seed: Date.now().toString(36), minutes: minutes || undefined })}`);

  return (
    <>
      <div className="page-title"><h1>Practice tests</h1><span className="badge" title="Not claimed to exist on the reference site">PrepLedger feature</span></div>
      <p className="small muted">Take a full sample set as a timed test, or build a custom test from chosen chapters. Tests run in your browser; sign in to save attempts and resume on another device.</p>
      <section className="panel panel-pad" style={{ marginBottom: 12 }}>
        <label className="field" style={{ maxWidth: 320 }}><span>Exam</span>
          <select value={exam} onChange={(e) => { setPicked(new Set()); setSp(e.target.value ? { exam: e.target.value } : {}); }} data-testid="practice-exam">
            <option value="">Choose an exam…</option>
            {exams.data?.categories.map((c) => <optgroup key={c.slug} label={c.name}>{c.exams.map((e) => <option key={e.slug} value={e.slug}>{e.name} ({e.question_count} Q)</option>)}</optgroup>)}
          </select>
        </label>
      </section>
      {detail.loading && <Loading />}
      {detail.error && <ErrorState error={detail.error} retry={detail.reload} />}
      {detail.data && (
        <div className="layout-2col aside-right aside-300">
          <section className="panel panel-pad">
            <h2>Custom test: choose chapters</h2>
            {detail.data.subjects.map((s: any) => {
              const chapters = s.units.flatMap((u: any) => u.chapters).filter((c: any) => c.question_count > 0);
              return (
                <div key={s.slug} className="unit">
                  <h3>{s.name}</h3>
                  {chapters.length === 0 ? <p className="small muted">No questions available yet.</p> : (
                    <ul className="chapter-list">
                      {chapters.map((c: any) => (
                        <li key={c.slug}>
                          <label className="check"><input type="checkbox" checked={picked.has(`${s.slug}/${c.slug}`)} onChange={() => toggle(`${s.slug}/${c.slug}`)} /> {c.name}</label>
                          <span className="count">{c.question_count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            <div className="row" style={{ marginTop: 10 }}>
              <label className="small">Questions <input type="number" min={1} max={100} value={n} onChange={(e) => setN(Math.max(1, Number(e.target.value) || 1))} style={{ width: 80 }} /></label>
              <label className="small">Minutes (optional) <input type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} style={{ width: 90 }} placeholder="auto" /></label>
              <button className="btn btn-primary" disabled={!picked.size} onClick={start} data-testid="start-custom">Start test ({Math.min(n, available)} Q)</button>
            </div>
          </section>
          <aside className="panel panel-pad">
            <h2>Full sets</h2>
            {detail.data.papers.samples.length === 0 ? <p className="small muted">No full sets available.</p> : (
              <ul className="side-list">
                {detail.data.papers.samples.map((p: any) => (
                  <li key={p.public_id} className="row-between" style={{ padding: '4px 0' }}>
                    <Link to={paperPath(detail.data.exam.category.slug, exam, p.slug, p.public_id)}>{p.title}</Link>
                    <Link className="btn btn-sm" to={`/test/paper/${p.public_id}`}>Start</Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="small muted" style={{ marginTop: 8 }}>Past papers become available as timed tests once their questions are imported.</p>
          </aside>
        </div>
      )}
    </>
  );
}
