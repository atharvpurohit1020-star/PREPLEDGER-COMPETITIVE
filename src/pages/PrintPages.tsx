import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { formatAnswer } from '../../shared/scoring';
import { ANSWER_SOURCE_LABELS, ANSWER_STATUS_LABELS } from '../../shared/types';
import { Content } from '../components/Content';
import { Matrix } from '../components/QuestionCard';
import { qs } from '../lib/api';
import { fmtDate, fmtDateTime } from '../lib/format';
import type { Question } from '../lib/types';
import { useApi } from '../lib/useApi';

function useOpts() {
  const [sp, setSp] = useSearchParams();
  const key = sp.get('key') !== '0';
  const sol = sp.get('solutions') !== '0';
  const toggle = (k: 'key' | 'solutions', on: boolean) => {
    const n = new URLSearchParams(sp);
    on ? n.delete(k) : n.set(k, '0');
    setSp(n, { replace: true });
  };
  return { key, sol, toggle, search: sp.toString() };
}

function Toolbar({ title, pdfPath, filename, opts }: { title: string; pdfPath: string; filename: string; opts: ReturnType<typeof useOpts> }) {
  const path = pdfPath + (opts.search ? `?${opts.search}` : '');
  return (
    <div className="print-toolbar">
      <strong>{title}</strong>
      <label className="check"><input type="checkbox" checked={opts.key} onChange={(e) => opts.toggle('key', e.target.checked)} /> Answer key</label>
      <label className="check"><input type="checkbox" checked={opts.sol} onChange={(e) => opts.toggle('solutions', e.target.checked)} /> Solutions</label>
      <button className="btn btn-sm btn-primary" onClick={() => window.print()}>Print</button>
      <a className="btn btn-sm" href={`/api/pdf${qs({ path, filename })}`}>Download PDF</a>
      <button className="btn btn-sm" onClick={() => window.history.length > 1 ? window.history.back() : window.close()}>Close</button>
    </div>
  );
}

function PrintQuestion({ q, n }: { q: Question; n: number | string }) {
  return (
    <div className="pq">
      <div className="pq-head">Q{n}. {q.type_label}{q.papers.length ? ` · ${q.papers.map((p) => p.title + (p.exam_date ? ` (${fmtDate(p.exam_date)})` : '')).join('; ')}` : ''}{q.is_pyq ? '' : ' · Sample, not a PYQ'}</div>
      {q.passage && <div style={{ border: '1px dashed #999', padding: 6, marginBottom: 6 }}><Content src={q.passage.body} diagrams={q.diagrams} /></div>}
      <Content src={q.body} diagrams={q.diagrams} />
      <Matrix q={q} />
      {q.options.length > 0 && (
        <ul className="pq-options">
          {q.options.map((o) => <li key={o.label}><strong>({o.label})</strong><Content as="span" src={o.body} diagrams={q.diagrams} /></li>)}
        </ul>
      )}
    </div>
  );
}

function KeyTable({ rows }: { rows: { n: number | string; q: Question }[] }) {
  return (
    <table className="key">
      <thead><tr><th>Q</th><th>Answer</th><th>Key status</th></tr></thead>
      <tbody>{rows.map(({ n, q }) => <tr key={q.public_id}><td>{n}</td><td>{q.answer ? (q.answer.status === 'dropped' ? 'Dropped' : formatAnswer(q.answer.value)) : 'Not available'}</td><td>{q.answer ? `${ANSWER_STATUS_LABELS[q.answer.status]} · ${ANSWER_SOURCE_LABELS[q.answer.source]}` : ''}</td></tr>)}</tbody>
    </table>
  );
}

function Solutions({ rows }: { rows: { n: number | string; q: Question }[] }) {
  return (
    <>
      {rows.map(({ n, q }) => (
        <div className="pq" key={q.public_id}>
          <div className="pq-head">Solution to Q{n}{q.answer ? ` — answer ${q.answer.status === 'dropped' ? 'dropped' : formatAnswer(q.answer.value)}` : ''}</div>
          {(q.solutions ?? []).length === 0 ? <p><em>No solution available.</em></p> : q.solutions!.map((s) => (
            <div key={s.id}>
              <div className="small" style={{ color: '#555' }}>{s.method_label ? `${s.method_label} · ` : ''}{s.kind === 'official' ? 'Official solution' : 'Editorial solution (not official)'}</div>
              <Content src={s.body} diagrams={q.diagrams} />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function usePrintTitle(t: string | null) {
  useEffect(() => { if (t) document.title = `${t} | PrepLedger PDF`; }, [t]);
}

export function PrintChapterPage() {
  const { exam = '', subject = '', chapter = '' } = useParams();
  const opts = useOpts();
  const { data, error, loading } = useApi<any>(`/api/exams/${exam}/subjects/${subject}/chapters/${chapter}?all=1`);
  usePrintTitle(data ? `${data.exam.name} ${data.chapter.name}` : null);
  if (loading) return <p className="print-doc">Preparing…</p>;
  if (error) return <div className="print-doc" data-print-state={error.status === 404 ? 'notfound' : 'error'}>{error.message}</div>;
  const rows = data.questions.map((q: Question, i: number) => ({ n: i + 1, q }));
  const title = `${data.exam.name} · ${data.subject.name} · ${data.chapter.name}`;
  return (
    <>
      <Toolbar title="Chapter PDF preview" pdfPath={`/print/chapter/${exam}/${subject}/${chapter}`} filename={`${exam}-${subject}-${chapter}.pdf`} opts={opts} />
      <div className="print-doc" data-print-state={rows.length ? 'ready' : 'empty'} data-testid="print-doc">
        {!rows.length ? <p>No questions are available in this chapter, so there is nothing to export.</p> : (
          <>
            <h1>{data.chapter.name}</h1>
            <div className="print-meta">
              {title} · {rows.length} question{rows.length === 1 ? "" : "s"} ({data.stats.pyqCount} past-year, {data.stats.sampleCount} original samples) · Generated {fmtDateTime(new Date().toISOString())} by PrepLedger from its own database. This is not an official document.
            </div>
            {rows.map((r: any) => <PrintQuestion key={r.q.public_id} q={r.q} n={r.n} />)}
            {opts.key && <div className="section-break"><h2>Answer key</h2><KeyTable rows={rows} /></div>}
            {opts.sol && <div className="section-break"><h2>Solutions</h2><Solutions rows={rows} /></div>}
          </>
        )}
      </div>
    </>
  );
}

export function PrintPaperPage() {
  const { paperId = '' } = useParams();
  const opts = useOpts();
  const { data, error, loading } = useApi<any>(`/api/papers/${paperId}`);
  usePrintTitle(data?.paper.title ?? null);
  if (loading) return <p className="print-doc">Preparing…</p>;
  if (error) return <div className="print-doc" data-print-state={error.status === 404 ? 'notfound' : 'error'}>{error.message}</div>;
  const p = data.paper;
  const rows = data.items.map((i: any) => ({ n: i.number, q: i.question, section: i.section }));
  const sections: { key: string; name: string }[] = p.sections ?? [];
  return (
    <>
      <Toolbar title="Paper PDF preview" pdfPath={`/print/paper/${paperId}`} filename={`${p.slug}.pdf`} opts={opts} />
      <div className="print-doc" data-print-state={rows.length ? 'ready' : 'empty'} data-testid="print-doc">
        {!rows.length ? <p>The questions of this paper are not available, so there is nothing to export.</p> : (
          <>
            <h1>{p.title}</h1>
            <div className="print-meta">
              {data.exam.name}{p.year ? ` · ${p.year}` : ''}{p.session ? ` · ${p.session}` : ''}{p.exam_date ? ` · ${fmtDate(p.exam_date)}` : ''}{p.shift ? ` · ${p.shift} shift` : ''}
              {p.duration_minutes ? ` · ${p.duration_minutes} min` : ''} · {rows.length} questions{p.kind === 'sample' ? ' · Original sample set, not a past paper' : ''}. Generated by PrepLedger; not an official document.
            </div>
            {(sections.length ? sections : [{ key: '', name: '' }]).map((s) => {
              const list = rows.filter((r: any) => !s.key || r.section === s.key);
              return list.length ? (
                <section key={s.key}>
                  {s.name && <h2>{s.name}</h2>}
                  {list.map((r: any) => <PrintQuestion key={r.q.public_id} q={r.q} n={r.n} />)}
                </section>
              ) : null;
            })}
            {opts.key && <div className="section-break"><h2>Answer key</h2><KeyTable rows={rows} /></div>}
            {opts.sol && <div className="section-break"><h2>Solutions</h2><Solutions rows={rows} /></div>}
          </>
        )}
      </div>
    </>
  );
}
