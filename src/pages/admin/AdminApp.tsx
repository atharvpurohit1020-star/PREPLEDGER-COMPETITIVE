import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { formatAnswer } from '../../../shared/scoring';
import { ANSWER_SOURCE_LABELS, ANSWER_STATUS_LABELS, QUESTION_TYPE_LABELS, QUESTION_TYPES } from '../../../shared/types';
import { Content } from '../../components/Content';
import { Pagination } from '../../components/Pagination';
import { Empty, ErrorState, Loading, NotFound } from '../../components/States';
import { api, ApiError, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime, questionPath } from '../../lib/format';
import { useHead } from '../../lib/head';
import { useApi } from '../../lib/useApi';

function Err({ e }: { e: ApiError | null }) {
  if (!e) return null;
  return (
    <div className="notice notice-danger" role="alert">
      <strong>{e.message}</strong>
      {e.details && <ul>{e.details.slice(0, 30).map((d, i) => <li key={i}>{d.path ? <code>{d.path}</code> : null} {d.message}</li>)}</ul>}
    </div>
  );
}

function useAction() {
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await fn();
      if (ok) setMsg(ok);
      return r;
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, msg, run, setMsg };
}

// ------------------------------------------------------------------ dashboard
function Dashboard() {
  const { data, error, loading, reload } = useApi<any>('/api/admin/summary');
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} retry={reload} />;
  const c = data.counts;
  return (
    <div className="stack">
      <div className="stat-grid">
        {[['Questions', c.questions], ['Published', c.published], ['Draft / review', c.unpublished], ['Verified', c.verified], ['Needs correction', c.needs_correction], ['Open reports', c.open_reports], ['Papers', c.papers], ['Imports', c.imports], ['Users', c.users]].map(([l, v]) => (
          <div className="stat" key={l}><div className="v">{v}</div><div className="l">{l}</div></div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-head"><h2>Recent activity</h2><Link to="/admin/audit">Full audit log</Link></div>
        <table className="data"><tbody>{data.recent.map((r: any, i: number) => <tr key={i}><td>{fmtDateTime(r.created_at)}</td><td>{r.actor ?? 'system'}</td><td><code>{r.action}</code></td><td>{r.entity_type} {r.entity_id}</td></tr>)}</tbody></table>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ question list
function QuestionList() {
  const [sp, setSp] = useSearchParams();
  const { data, error, loading, reload } = useApi<any>(`/api/admin/questions${qs({ q: sp.get('q'), exam: sp.get('exam'), status: sp.get('status'), verification: sp.get('verification'), page: sp.get('page') })}`);
  const tax = useApi<any>('/api/admin/taxonomy');
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); n.delete('page'); setSp(n); };
  return (
    <>
      <div className="row-between"><h2>Questions</h2><Link className="btn btn-primary btn-sm" to="/admin/questions/new">New question</Link></div>
      <div className="filters panel" style={{ margin: '8px 0' }}>
        <input type="search" placeholder="Text, ID or source ref" defaultValue={sp.get('q') ?? ''} onKeyDown={(e) => e.key === 'Enter' && set('q', (e.target as HTMLInputElement).value)} aria-label="Search questions" />
        <select value={sp.get('exam') ?? ''} onChange={(e) => set('exam', e.target.value)} aria-label="Exam"><option value="">All exams</option>{tax.data?.exams.map((e: any) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</select>
        <select value={sp.get('status') ?? ''} onChange={(e) => set('status', e.target.value)} aria-label="Status"><option value="">Any status</option>{['draft', 'in_review', 'published', 'archived'].map((s) => <option key={s}>{s}</option>)}</select>
        <select value={sp.get('verification') ?? ''} onChange={(e) => set('verification', e.target.value)} aria-label="Verification"><option value="">Any verification</option>{['unverified', 'verified', 'needs_correction'].map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      {loading && <Loading />}
      {error && <ErrorState error={error} retry={reload} />}
      {data && (
        <>
          <p className="small muted">{data.total} questions</p>
          <div className="table-scroll panel">
            <table className="data" data-testid="admin-questions">
              <thead><tr><th>ID</th><th>Exam / chapter</th><th>Preview</th><th>Type</th><th>Status</th><th>Verification</th><th>Source</th><th className="num">Reports</th></tr></thead>
              <tbody>
                {data.questions.map((q: any) => (
                  <tr key={q.public_id}>
                    <td><Link to={`/admin/questions/${q.public_id}`}><code>{q.public_id}</code></Link></td>
                    <td>{q.exam}<br /><span className="small muted">{q.subject} · {q.chapter}</span></td>
                    <td className="small">{q.preview}</td>
                    <td className="small">{q.type}</td>
                    <td><span className={`badge ${q.status === 'published' ? 'badge-success' : q.status === 'archived' ? '' : 'badge-warn'}`}>{q.status}</span></td>
                    <td className="small">{q.verification_status}</td>
                    <td className="small">{q.source_type}{q.is_pyq ? ' · PYQ' : ''}</td>
                    <td className="num">{q.open_reports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} />
        </>
      )}
    </>
  );
}

// ------------------------------------------------------------------ question editor
interface Form {
  exam: string; subject: string; chapter: string; type: string; body: string; options: { label: string; body: string }[]; matrix: string;
  marks: string; negative_marks: string; difficulty: string; topics: string; status: string; verification_status: string; is_pyq: boolean;
  solutions: { kind: string; method_label: string; body: string; is_verified: boolean; author_name: string }[]; change_note: string; source_record_id: string;
  answer_value: string; answer_status: string; answer_source: string; answer_note: string;
}

export function parseAnswerInput(type: string, v: string) {
  const s = v.trim();
  if (['numerical', 'integer'].includes(type)) {
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^(-?\d+(?:\.\d+)?)\s*(?:\.\.|to)\s*(-?\d+(?:\.\d+)?)$/))) return { range: [Number(m[1]), Number(m[2])] as [number, number] };
    if ((m = s.match(/^(-?\d+(?:\.\d+)?)\s*(?:±|\+-)\s*(\d+(?:\.\d+)?)$/))) return { numeric: Number(m[1]), tolerance: Number(m[2]) };
    if (/^-?\d+(?:\.\d+)?$/.test(s)) return { numeric: Number(s) };
    return null;
  }
  const opts = s.toUpperCase().split(/[\s,;]+/).filter(Boolean);
  return opts.length && opts.every((o) => /^[A-Z]$/.test(o)) ? { options: opts } : null;
}

function toForm(q: any, source_record_id = ''): Form {
  return {
    exam: q.exam.slug, subject: q.subject.slug, chapter: q.chapter.slug, type: q.type, body: q.body, options: q.options, matrix: q.matrix ? JSON.stringify(q.matrix, null, 2) : '',
    marks: q.marks ?? '', negative_marks: q.negative_marks ?? '', difficulty: q.difficulty ?? '', topics: q.topics.map((t: any) => t.slug).join(', '), status: q.status,
    verification_status: q.verification_status, is_pyq: q.is_pyq,
    solutions: (q.solutions ?? []).map((s: any) => ({ kind: s.kind, method_label: s.method_label ?? '', body: s.body, is_verified: s.is_verified, author_name: s.author_name ?? '' })),
    change_note: '', source_record_id, answer_value: '', answer_status: 'final', answer_source: 'editorial', answer_note: '',
  };
}

const emptyForm: Form = {
  exam: '', subject: '', chapter: '', type: 'mcq_single', body: '', options: ['A', 'B', 'C', 'D'].map((label) => ({ label, body: '' })), matrix: '', marks: '', negative_marks: '', difficulty: '',
  topics: '', status: 'draft', verification_status: 'unverified', is_pyq: false, solutions: [], change_note: 'Initial version', source_record_id: '', answer_value: '', answer_status: 'final', answer_source: 'editorial', answer_note: '',
};

function payload(f: Form, includeAnswer: boolean) {
  const num = (s: string) => (s === '' ? null : Number(s));
  const hasOptions = ['mcq_single', 'mcq_multi', 'matrix_match', 'assertion_reason'].includes(f.type);
  let matrix: unknown = null;
  if (f.type === 'matrix_match' && f.matrix.trim()) {
    try { matrix = JSON.parse(f.matrix); } catch { throw new ApiError(400, 'Matrix JSON is not valid'); }
  }
  const p: any = {
    subject: f.subject, chapter: f.chapter, type: f.type, body: f.body, options: hasOptions ? f.options : [], matrix, marks: num(String(f.marks)), negative_marks: num(String(f.negative_marks)),
    difficulty: f.difficulty || null, topics: f.topics.split(',').map((t) => t.trim()).filter(Boolean), status: f.status, verification_status: f.verification_status, is_pyq: f.is_pyq,
    solutions: f.solutions.map((s) => ({ ...s, method_label: s.method_label || null, author_name: s.author_name || null })), change_note: f.change_note,
  };
  if (includeAnswer && f.answer_value.trim()) {
    const value = parseAnswerInput(f.type, f.answer_value);
    if (!value) throw new ApiError(400, 'Answer format not recognised (use e.g. "B", "A,C", "2.5", "2.5±0.1" or "1.2..1.4")');
    p.answer = { value, status: f.answer_status, source: f.answer_source, note: f.answer_note || undefined };
  }
  return p;
}

function QuestionForm({ f, setF, tax }: { f: Form; setF: (f: Form) => void; tax: any }) {
  const exam = tax.exams.find((e: any) => e.slug === f.exam);
  const subjects = exam ? tax.subjects.filter((s: any) => s.exam_id === exam.id) : [];
  const subject = subjects.find((s: any) => s.slug === f.subject);
  const chapters = subject ? tax.chapters.filter((c: any) => c.subject_id === subject.id) : [];
  const up = (patch: Partial<Form>) => setF({ ...f, ...patch });
  const hasOptions = ['mcq_single', 'mcq_multi', 'matrix_match', 'assertion_reason'].includes(f.type);
  return (
    <div className="stack">
      <div className="row">
        <label className="field"><span>Subject</span><select value={f.subject} onChange={(e) => up({ subject: e.target.value, chapter: '' })}><option value="">—</option>{subjects.map((s: any) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
        <label className="field"><span>Chapter</span><select value={f.chapter} onChange={(e) => up({ chapter: e.target.value })}><option value="">—</option>{chapters.map((c: any) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
        <label className="field"><span>Type</span><select value={f.type} onChange={(e) => up({ type: e.target.value })}>{QUESTION_TYPES.map((t) => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}</select></label>
      </div>
      <label className="field"><span>Question body (Markdown + LaTeX: $…$, $$…$$, \ce&#123;…&#125;, ![alt](diagram:ID))</span><textarea rows={7} value={f.body} onChange={(e) => up({ body: e.target.value })} data-testid="body-input" /></label>
      {hasOptions && (
        <fieldset className="panel panel-pad"><legend className="small"><strong>Options</strong></legend>
          {f.options.map((o, i) => (
            <div className="row" key={i} style={{ alignItems: 'flex-start', marginBottom: 6 }}>
              <strong style={{ width: 20 }}>{o.label}</strong>
              <textarea rows={1} value={o.body} onChange={(e) => up({ options: f.options.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} style={{ flex: 1 }} aria-label={`Option ${o.label}`} />
            </div>
          ))}
          <div className="row">
            <button type="button" className="btn btn-sm" onClick={() => up({ options: [...f.options, { label: String.fromCharCode(65 + f.options.length), body: '' }] })} disabled={f.options.length >= 6}>Add option</button>
            <button type="button" className="btn btn-sm" onClick={() => up({ options: f.options.slice(0, -1) })} disabled={f.options.length <= 2}>Remove last</button>
          </div>
        </fieldset>
      )}
      {f.type === 'matrix_match' && <label className="field"><span>Matrix lists (JSON: {'{"left":[{"key":"P","body":"…"}],"right":[{"key":"1","body":"…"}]}'})</span><textarea rows={6} value={f.matrix} onChange={(e) => up({ matrix: e.target.value })} /></label>}
      <div className="row">
        <label className="field"><span>Marks</span><input type="number" value={f.marks} onChange={(e) => up({ marks: e.target.value })} style={{ width: 90 }} /></label>
        <label className="field"><span>Negative</span><input type="number" value={f.negative_marks} onChange={(e) => up({ negative_marks: e.target.value })} style={{ width: 90 }} /></label>
        <label className="field"><span>Difficulty</span><select value={f.difficulty} onChange={(e) => up({ difficulty: e.target.value })}><option value="">—</option><option>easy</option><option>medium</option><option>hard</option></select></label>
        <label className="field"><span>Status</span><select value={f.status} onChange={(e) => up({ status: e.target.value })} data-testid="status-select">{['draft', 'in_review', 'published', 'archived'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="field"><span>Verification</span><select value={f.verification_status} onChange={(e) => up({ verification_status: e.target.value })}>{['unverified', 'verified', 'needs_correction'].map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <div className="row">
        <label className="field" style={{ flex: 1 }}><span>Topics (comma-separated slugs)</span><input type="text" value={f.topics} onChange={(e) => up({ topics: e.target.value })} /></label>
        <label className="check"><input type="checkbox" checked={f.is_pyq} onChange={(e) => up({ is_pyq: e.target.checked })} /> Past-year question</label>
      </div>
      <fieldset className="panel panel-pad"><legend className="small"><strong>Solutions</strong></legend>
        {f.solutions.map((s, i) => (
          <div key={i} className="stack" style={{ borderBottom: '1px dashed var(--line)', paddingBottom: 8, marginBottom: 8 }}>
            <div className="row">
              <select value={s.kind} onChange={(e) => up({ solutions: f.solutions.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)) })} aria-label="Solution kind"><option value="editorial">Editorial</option><option value="official">Official</option><option value="community">Community</option></select>
              <input type="text" placeholder="Method label (optional)" value={s.method_label} onChange={(e) => up({ solutions: f.solutions.map((x, j) => (j === i ? { ...x, method_label: e.target.value } : x)) })} />
              <input type="text" placeholder="Author" value={s.author_name} onChange={(e) => up({ solutions: f.solutions.map((x, j) => (j === i ? { ...x, author_name: e.target.value } : x)) })} />
              <label className="check"><input type="checkbox" checked={s.is_verified} onChange={(e) => up({ solutions: f.solutions.map((x, j) => (j === i ? { ...x, is_verified: e.target.checked } : x)) })} /> Reviewed</label>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => up({ solutions: f.solutions.filter((_, j) => j !== i) })}>Remove</button>
            </div>
            <textarea rows={4} value={s.body} onChange={(e) => up({ solutions: f.solutions.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} aria-label="Solution body" />
          </div>
        ))}
        <button type="button" className="btn btn-sm" onClick={() => up({ solutions: [...f.solutions, { kind: 'editorial', method_label: '', body: '', is_verified: false, author_name: '' }] })}>Add solution</button>
      </fieldset>
    </div>
  );
}

function Preview({ f, diagrams }: { f: Form; diagrams: Record<string, any> }) {
  let matrix: any = null;
  try { matrix = f.matrix ? JSON.parse(f.matrix) : null; } catch { matrix = null; }
  return (
    <div className="q-card" data-testid="preview">
      <div className="q-head"><span className="q-num">Live preview</span><span className="badge">{QUESTION_TYPE_LABELS[f.type as keyof typeof QUESTION_TYPE_LABELS]}</span></div>
      <div className="q-body"><Content src={f.body} diagrams={diagrams} /></div>
      {matrix?.left && <div className="matrix-lists" style={{ padding: '0 14px' }}>{[matrix.left, matrix.right].map((side: any[], i: number) => <table className="q-table" key={i}><tbody>{side?.map((r: any) => <tr key={r.key}><td>{r.key}</td><td><Content as="span" src={r.body} diagrams={diagrams} /></td></tr>)}</tbody></table>)}</div>}
      {['mcq_single', 'mcq_multi', 'matrix_match', 'assertion_reason'].includes(f.type) && <ul className="options">{f.options.map((o) => <li key={o.label} className="option"><span className="opt-label">{o.label}</span><span className="opt-body"><Content as="span" src={o.body} diagrams={diagrams} /></span></li>)}</ul>}
      {f.solutions.map((s, i) => <div key={i} className="answer-box"><div className="solution"><div className="solution-head">{s.method_label || 'Solution'} · {s.kind}</div><Content src={s.body} diagrams={diagrams} /></div></div>)}
    </div>
  );
}

function AnswerKeyPanel({ q, onDone }: { q: any; onDone: () => void }) {
  const [v, setV] = useState('');
  const [status, setStatus] = useState('revised');
  const [source, setSource] = useState('editorial');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const a = useAction();
  const add = () => a.run(async () => {
    const value = parseAnswerInput(q.type, v);
    if (!value) throw new ApiError(400, 'Answer format not recognised');
    await api.post(`/api/admin/questions/${q.public_id}/answer-keys`, { value, status, source, note: note || undefined, effective_at: date || undefined });
    setV(''); setNote('');
    onDone();
  }, 'New answer-key version added.');
  return (
    <section className="panel panel-pad">
      <h3>Answer key</h3>
      <ol className="small" data-testid="admin-key-history">
        {(q.answer_history ?? []).map((h: any) => <li key={h.version}>v{h.version}: <strong>{formatAnswer(h.value)}</strong> · {ANSWER_STATUS_LABELS[h.status as keyof typeof ANSWER_STATUS_LABELS]} · {ANSWER_SOURCE_LABELS[h.source as keyof typeof ANSWER_SOURCE_LABELS]}{h.is_current ? ' · current' : ''}{h.note ? ` — ${h.note}` : ''}</li>)}
      </ol>
      <div className="row">
        <input type="text" placeholder={['numerical', 'integer'].includes(q.type) ? '2.5 / 2.5±0.1 / 1.2..1.4' : 'B or A,C'} value={v} onChange={(e) => setV(e.target.value)} aria-label="New answer" style={{ width: 150 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Key status">{Object.entries(ANSWER_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Key source">{Object.entries(ANSWER_SOURCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <input type="text" placeholder="Note / reason" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Key note" />
        <input type="text" placeholder="YYYY-MM-DD" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Effective date" style={{ width: 120 }} />
        <button className="btn btn-sm" onClick={add} disabled={a.busy || (!v && status !== 'dropped')}>Add version</button>
      </div>
      {a.msg && <p className="small" role="status">{a.msg}</p>}
      <Err e={a.error} />
    </section>
  );
}

function QuestionEditor() {
  const { pid } = useParams();
  const isNew = pid === 'new';
  const nav = useNavigate();
  const tax = useApi<any>('/api/admin/taxonomy');
  const detail = useApi<any>(isNew ? null : `/api/admin/questions/${pid}`);
  const sources = useApi<any>(isNew ? '/api/admin/sources' : null);
  const diagrams = useApi<any>('/api/admin/diagrams');
  const [f, setF] = useState<Form | null>(isNew ? emptyForm : null);
  const a = useAction();
  useEffect(() => { if (detail.data) setF(toForm(detail.data.question, String(detail.data.source_record_id))); }, [detail.data]);
  const diagramMap = useMemo(() => Object.fromEntries((diagrams.data?.diagrams ?? []).map((d: any) => [d.public_id, d])), [diagrams.data]);
  if (tax.loading || detail.loading || !f) return detail.error ? <ErrorState error={detail.error} /> : <Loading />;
  const q = detail.data?.question;
  const save = () => a.run(async () => {
    if (isNew) {
      const r = await api.post<any>('/api/admin/questions', { ...payload(f, true), exam: f.exam, source_record_id: Number(f.source_record_id) });
      nav(`/admin/questions/${r.public_id}`);
    } else {
      await api.put(`/api/admin/questions/${pid}`, payload(f, false));
      detail.reload();
    }
  }, 'Saved.');
  const quick = (patch: any, label: string) => a.run(async () => { await api.post(`/api/admin/questions/${pid}/status`, patch); detail.reload(); }, label);
  const restore = (rev: number) => confirm(`Restore revision ${rev}? This creates a new revision.`) && a.run(async () => { await api.post(`/api/admin/questions/${pid}/revisions/${rev}/restore`); detail.reload(); }, `Revision ${rev} restored.`);
  return (
    <>
      <div className="row-between">
        <h2>{isNew ? 'New question' : <>Question <code>{pid}</code></>}</h2>
        {!isNew && (
          <span className="row">
            {q.status !== 'published' && <button className="btn btn-sm btn-primary" onClick={() => quick({ status: 'published' }, 'Published.')} data-testid="publish">Publish</button>}
            {q.status === 'published' && <button className="btn btn-sm" onClick={() => quick({ status: 'draft' }, 'Unpublished.')} data-testid="unpublish">Unpublish</button>}
            {q.verification_status !== 'verified' && <button className="btn btn-sm" onClick={() => quick({ verification_status: 'verified' }, 'Marked verified.')}>Mark verified</button>}
            {q.status === 'published' && <Link className="btn btn-sm" to={questionPath(q.public_id)} target="_blank">View public page</Link>}
          </span>
        )}
      </div>
      {!isNew && detail.data.duplicates.length > 0 && <p className="notice notice-warn">Possible duplicates: {detail.data.duplicates.map((d: string) => <Link key={d} to={`/admin/questions/${d}`} style={{ marginRight: 6 }}><code>{d}</code></Link>)}</p>}
      {isNew && (
        <div className="row">
          <label className="field"><span>Exam</span><select value={f.exam} onChange={(e) => setF({ ...f, exam: e.target.value, subject: '', chapter: '' })} data-testid="exam-select"><option value="">—</option>{tax.data.exams.map((e: any) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</select></label>
          <label className="field"><span>Source record</span><select value={f.source_record_id} onChange={(e) => setF({ ...f, source_record_id: e.target.value })} data-testid="source-select"><option value="">—</option>{sources.data?.sources.map((s: any) => <option key={s.id} value={s.id}>{s.title} ({s.source_type})</option>)}</select></label>
        </div>
      )}
      <div className="editor-grid">
        <div>
          <QuestionForm f={f} setF={setF} tax={tax.data} />
          {isNew && (
            <fieldset className="panel panel-pad" style={{ marginTop: 12 }}><legend className="small"><strong>Answer key</strong></legend>
              <div className="row">
                <input type="text" placeholder="B, A,C, 2.5, 2.5±0.1, 1.2..1.4" value={f.answer_value} onChange={(e) => setF({ ...f, answer_value: e.target.value })} aria-label="Answer" data-testid="answer-input" />
                <select value={f.answer_status} onChange={(e) => setF({ ...f, answer_status: e.target.value })} aria-label="Status">{Object.entries(ANSWER_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                <select value={f.answer_source} onChange={(e) => setF({ ...f, answer_source: e.target.value })} aria-label="Source">{Object.entries(ANSWER_SOURCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </div>
            </fieldset>
          )}
          <label className="field" style={{ marginTop: 12 }}><span>Change note (required)</span><input type="text" value={f.change_note} onChange={(e) => setF({ ...f, change_note: e.target.value })} data-testid="change-note" /></label>
          <div className="row"><button className="btn btn-primary" onClick={save} disabled={a.busy} data-testid="save-question">{a.busy ? 'Saving…' : 'Save'}</button>{a.msg && <span role="status" className="small">{a.msg}</span>}</div>
          <Err e={a.error} />
        </div>
        <div className="stack">
          <Preview f={f} diagrams={{ ...diagramMap, ...(q?.diagrams ?? {}) }} />
          {!isNew && <AnswerKeyPanel q={q} onDone={detail.reload} />}
          {!isNew && (
            <section className="panel panel-pad">
              <h3>Revisions</h3>
              <table className="data small" data-testid="revisions"><tbody>{detail.data.revisions.map((r: any) => <tr key={r.revision}><td>r{r.revision}</td><td>{fmtDateTime(r.created_at)}</td><td>{r.author ?? 'system'}</td><td>{r.change_note}</td><td><button className="btn btn-sm" onClick={() => restore(r.revision)}>Restore</button></td></tr>)}</tbody></table>
            </section>
          )}
          {!isNew && detail.data.reports.length > 0 && (
            <section className="panel panel-pad">
              <h3>Reports</h3>
              <ul className="small">{detail.data.reports.map((r: any) => <li key={r.id}><strong>{r.reason}</strong> ({r.status}) {r.details}</li>)}</ul>
              <Link to="/admin/reports">Manage reports ›</Link>
            </section>
          )}
          {!isNew && <section className="panel panel-pad small"><h3>Provenance</h3><p>{q.source.title} · {q.source.type}<br />{q.source.license}<br /><span className="muted">{q.source.permission}</span><br />Ref: {q.source.ref}</p></section>}
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ imports
function Imports() {
  const list = useApi<any>('/api/admin/imports');
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [content, setContent] = useState('');
  const [filename, setFilename] = useState('');
  const [source, setSource] = useState({ source_type: 'licensed_dataset', title: '', license: '', permission_note: '', publisher: '', rights_holder: '' });
  const [res, setRes] = useState<any>(null);
  const a = useAction();
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFilename(file.name);
    setFormat(file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json');
    setContent(await file.text());
  };
  const validate = () => a.run(async () => {
    const src = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ''));
    setRes(await api.post('/api/admin/imports/validate', { format, content, filename: filename || undefined, source: format === 'csv' ? src : undefined }));
    list.reload();
  });
  const commit = (id: number) => a.run(async () => { const r = await api.post<any>(`/api/admin/imports/${id}/commit`); setRes(null); list.reload(); return r; }, `Import #${id} committed.`);
  const rollback = (id: number) => confirm(`Roll back import #${id}? Its questions will be archived (not deleted).`) && a.run(async () => { const r = await api.post<any>(`/api/admin/imports/${id}/rollback`); list.reload(); a.setMsg(`Rolled back: ${r.archived} questions archived.`); });
  return (
    <div className="stack">
      <h2>Bulk import</h2>
      <p className="small">Download a template: <a href="/api/admin/import-template?format=json">JSON</a> · <a href="/api/admin/import-template?format=csv">CSV</a>. JSON supports papers, passages, diagrams, answer-key history and multiple solutions. CSV supports one question per row with provenance supplied below. Every import is validated (schema, taxonomy, answer/option consistency, formulas, diagrams, duplicates, provenance rules) and previewed before you commit.</p>
      <section className="panel panel-pad">
        <div className="row">
          <input type="file" accept=".json,.csv,application/json,text/csv" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Import file" data-testid="import-file" />
          <select value={format} onChange={(e) => setFormat(e.target.value as any)} aria-label="Format"><option value="json">JSON</option><option value="csv">CSV</option></select>
        </div>
        <textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} placeholder="…or paste JSON / CSV here" aria-label="Import content" data-testid="import-content" style={{ marginTop: 8 }} />
        {format === 'csv' && (
          <div className="row" style={{ marginTop: 8 }}>
            <select value={source.source_type} onChange={(e) => setSource({ ...source, source_type: e.target.value })} aria-label="Source type">{['licensed_dataset', 'official_document', 'public_domain', 'original_sample', 'user_contribution'].map((s) => <option key={s}>{s}</option>)}</select>
            <input type="text" placeholder="Source title" value={source.title} onChange={(e) => setSource({ ...source, title: e.target.value })} />
            <input type="text" placeholder="Licence" value={source.license} onChange={(e) => setSource({ ...source, license: e.target.value })} />
            <input type="text" placeholder="Rights holder" value={source.rights_holder} onChange={(e) => setSource({ ...source, rights_holder: e.target.value })} />
            <input type="text" placeholder="Why may this be used? (permission)" value={source.permission_note} onChange={(e) => setSource({ ...source, permission_note: e.target.value })} style={{ flex: 1 }} />
          </div>
        )}
        <p style={{ marginTop: 8 }}><button className="btn btn-primary" onClick={validate} disabled={!content || a.busy} data-testid="validate-import">Validate &amp; preview</button></p>
        <Err e={a.error} />
        {a.msg && <p className="notice notice-success" role="status">{a.msg}</p>}
      </section>
      {res && (
        <section className="panel panel-pad" data-testid="validation-report">
          <h3>Validation report — batch #{res.batch_id} {res.report.ok ? <span className="badge badge-success">Valid</span> : <span className="badge badge-danger">Invalid</span>}</h3>
          <p className="small">{res.report.counts.questions} questions · {res.report.counts.papers} papers · {res.report.counts.diagrams} diagrams · {res.report.counts.passages} passages · {res.report.errors.length} errors · {res.report.warnings.length} warnings · {res.report.duplicates.length} possible duplicates</p>
          {res.report.errors.length > 0 && <ul className="errors" data-testid="import-errors">{res.report.errors.slice(0, 100).map((e: any, i: number) => <li key={i}><code>{e.path}</code> {e.message}</li>)}</ul>}
          {res.report.warnings.length > 0 && <ul className="small" style={{ color: 'var(--warn)' }}>{res.report.warnings.slice(0, 100).map((e: any, i: number) => <li key={i}><code>{e.path}</code> {e.message}</li>)}</ul>}
          {res.preview.length > 0 && <h4>Preview (first {res.preview.length})</h4>}
          {res.preview.map((p: any) => (
            <div key={p.ref} className="q-card">
              <div className="q-head"><span className="q-num">{p.ref}</span><span className="small muted">{p.exam} / {p.subject} / {p.chapter} · {p.type} · answer {formatAnswer(p.answer.value)} ({p.answer.source})</span></div>
              <div className="q-body"><Content src={p.body} diagrams={p.diagrams} /></div>
              {p.options.length > 0 && <ul className="options">{p.options.map((o: any) => <li key={o.label} className="option"><span className="opt-label">{o.label}</span><span className="opt-body"><Content as="span" src={o.body} diagrams={p.diagrams} /></span></li>)}</ul>}
            </div>
          ))}
          {res.report.ok && <p><button className="btn btn-primary" onClick={() => commit(res.batch_id)} disabled={a.busy} data-testid="commit-import">Commit import</button></p>}
        </section>
      )}
      <section className="panel">
        <div className="panel-head"><h3>Import history</h3></div>
        {list.data && (
          <div className="table-scroll">
            <table className="data" data-testid="import-history">
              <thead><tr><th>#</th><th>File</th><th>Status</th><th>Counts</th><th>Errors</th><th>Created</th><th /></tr></thead>
              <tbody>{list.data.imports.map((b: any) => (
                <tr key={b.id}><td>{b.id}</td><td>{b.filename ?? '—'} ({b.format})</td><td><span className={`badge ${b.status === 'committed' ? 'badge-success' : b.status === 'failed' ? 'badge-danger' : b.status === 'rolled_back' ? '' : 'badge-warn'}`}>{b.status}</span></td>
                  <td className="small">{b.counts ? `${b.counts.questions} Q, ${b.counts.papers} P` : ''}</td><td>{b.errors}</td><td className="small">{fmtDateTime(b.created_at)}<br />{b.author}</td>
                  <td>{b.status === 'validated' && <button className="btn btn-sm" onClick={() => commit(b.id)}>Commit</button>}{b.status === 'committed' && <button className="btn btn-sm btn-danger" onClick={() => rollback(b.id)} data-testid={`rollback-${b.id}`}>Roll back</button>}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ taxonomy
function Taxonomy() {
  const { data, error, loading, reload } = useApi<any>('/api/admin/taxonomy');
  const [exam, setExam] = useState('jee-main');
  const [newCh, setNewCh] = useState<Record<number, { slug: string; name: string; unit_name: string }>>({});
  const [newSub, setNewSub] = useState({ slug: '', name: '' });
  const a = useAction();
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} retry={reload} />;
  const e = data.exams.find((x: any) => x.slug === exam);
  const sv = data.syllabus.filter((s: any) => s.exam_id === e?.id);
  const statusOf = (cid: number, v: any) => v.mappings?.find((m: any) => m.chapter_id === cid)?.status ?? '';
  return (
    <div className="stack">
      <div className="row-between"><h2>Taxonomy</h2>
        <select value={exam} onChange={(ev) => setExam(ev.target.value)} aria-label="Exam">{data.exams.map((x: any) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select>
      </div>
      <Err e={a.error} />{a.msg && <p className="small" role="status">{a.msg}</p>}
      {e && data.subjects.filter((s: any) => s.exam_id === e.id).map((s: any) => (
        <section key={s.id} className="panel">
          <div className="panel-head"><h3>{s.name} <code className="small">{s.slug}</code></h3></div>
          <div className="table-scroll">
            <table className="data small">
              <thead><tr><th>Unit</th><th>Chapter</th><th>Slug</th><th className="num">Q</th><th>Topics</th>{sv.map((v: any) => <th key={v.id}>{v.label}</th>)}</tr></thead>
              <tbody>
                {data.chapters.filter((c: any) => c.subject_id === s.id).map((c: any) => (
                  <tr key={c.id}>
                    <td>{c.unit_name}</td><td>{c.name}</td><td><code>{c.slug}</code></td><td className="num">{c.question_count}</td>
                    <td>{data.topics.filter((t: any) => t.chapter_id === c.id).map((t: any) => t.name).join(', ')}
                      {' '}<button className="btn-link" onClick={() => { const name = prompt('New topic name'); if (name) a.run(async () => { await api.post(`/api/admin/chapters/${c.id}/topics`, { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name }); reload(); }, 'Topic added.'); }}>+ topic</button></td>
                    {sv.map((v: any) => (
                      <td key={v.id}>
                        <select value={statusOf(c.id, v)} aria-label={`Syllabus status for ${c.name}`} onChange={(ev) => a.run(async () => { await api.put(`/api/admin/chapters/${c.id}/syllabus`, { syllabus_version_id: v.id, status: ev.target.value || null }); reload(); }, 'Syllabus mapping saved.')}>
                          <option value="">—</option><option value="in_syllabus">in syllabus</option><option value="reduced">reduced</option><option value="removed">removed</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ padding: 10 }}>
            <input type="text" placeholder="new-chapter-slug" value={newCh[s.id]?.slug ?? ''} onChange={(ev) => setNewCh({ ...newCh, [s.id]: { ...(newCh[s.id] ?? { name: '', unit_name: '' }), slug: ev.target.value } })} aria-label="Chapter slug" />
            <input type="text" placeholder="Chapter name" value={newCh[s.id]?.name ?? ''} onChange={(ev) => setNewCh({ ...newCh, [s.id]: { ...(newCh[s.id] ?? { slug: '', unit_name: '' }), name: ev.target.value } })} aria-label="Chapter name" />
            <input type="text" placeholder="Unit" value={newCh[s.id]?.unit_name ?? ''} onChange={(ev) => setNewCh({ ...newCh, [s.id]: { ...(newCh[s.id] ?? { slug: '', name: '' }), unit_name: ev.target.value } })} aria-label="Unit" />
            <button className="btn btn-sm" onClick={() => a.run(async () => { await api.post(`/api/admin/subjects/${s.id}/chapters`, newCh[s.id]); setNewCh({ ...newCh, [s.id]: { slug: '', name: '', unit_name: '' } }); reload(); }, 'Chapter added.')}>Add chapter</button>
          </div>
        </section>
      ))}
      <section className="panel panel-pad">
        <h3>Add subject to {e?.name}</h3>
        <div className="row"><input type="text" placeholder="slug" value={newSub.slug} onChange={(ev) => setNewSub({ ...newSub, slug: ev.target.value })} aria-label="Subject slug" /><input type="text" placeholder="Name" value={newSub.name} onChange={(ev) => setNewSub({ ...newSub, name: ev.target.value })} aria-label="Subject name" />
          <button className="btn btn-sm" onClick={() => a.run(async () => { await api.post(`/api/admin/exams/${exam}/subjects`, newSub); setNewSub({ slug: '', name: '' }); reload(); }, 'Subject added.')}>Add subject</button></div>
        <h3 style={{ marginTop: 12 }}>Syllabus versions</h3>
        {sv.length ? <ul className="small">{sv.map((v: any) => <li key={v.id}>{v.label} {v.is_verified ? '(verified)' : '(unverified)'}</li>)}</ul> : <p className="small muted">None.</p>}
        <button className="btn btn-sm" onClick={() => { const label = prompt('Syllabus version label (e.g. "2025 official syllabus")'); if (label) a.run(async () => { await api.post(`/api/admin/exams/${exam}/syllabus-versions`, { label }); reload(); }, 'Syllabus version added.'); }}>Add syllabus version</button>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ papers
function Papers() {
  const tax = useApi<any>('/api/admin/taxonomy');
  const [exam, setExam] = useState('');
  const list = useApi<any>(`/api/admin/papers${qs({ exam })}`);
  const [form, setForm] = useState({ exam: 'jee-main', title: '', kind: 'past_paper', year: '', exam_date: '', shift: '', session: '', duration_minutes: '' });
  const [edit, setEdit] = useState<string | null>(null);
  const [items, setItems] = useState('');
  const a = useAction();
  const create = () => a.run(async () => {
    const n = (s: string) => (s ? Number(s) : undefined);
    await api.post('/api/admin/papers', { ...form, year: n(form.year), duration_minutes: n(form.duration_minutes), exam_date: form.exam_date || undefined, shift: form.shift || undefined, session: form.session || undefined });
    list.reload();
  }, 'Paper created (draft).');
  const patch = (pid: string, body: any, m: string) => a.run(async () => { await api.patch(`/api/admin/papers/${pid}`, body); list.reload(); }, m);
  const openItems = async (pid: string) => {
    const d = await api.get<any>(`/api/papers/${pid}`).catch(() => ({ items: [] }));
    setItems(d.items.map((i: any) => `${i.number},${i.question.public_id},${i.section ?? ''}`).join('\n'));
    setEdit(pid);
  };
  const saveItems = () => a.run(async () => {
    const parsed = items.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [n, q, s] = l.split(',').map((x) => x.trim()); return { number: Number(n), question: q, section: s || null }; });
    await api.put(`/api/admin/papers/${edit}/questions`, { items: parsed });
    list.reload();
  }, 'Paper questions saved.');
  return (
    <div className="stack">
      <h2>Papers</h2>
      <section className="panel panel-pad">
        <h3>New paper</h3>
        <div className="row">
          <select value={form.exam} onChange={(e) => setForm({ ...form, exam: e.target.value })} aria-label="Exam">{tax.data?.exams.map((e: any) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</select>
          <input type="text" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Title" />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} aria-label="Kind"><option value="past_paper">Past paper</option><option value="sample">Sample</option></select>
          <input type="number" placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} style={{ width: 90 }} aria-label="Year" />
          <input type="text" placeholder="YYYY-MM-DD" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} style={{ width: 120 }} aria-label="Date" />
          <input type="text" placeholder="Session" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} style={{ width: 100 }} aria-label="Session" />
          <input type="text" placeholder="Shift" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} style={{ width: 100 }} aria-label="Shift" />
          <input type="number" placeholder="Minutes" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} style={{ width: 90 }} aria-label="Duration" />
          <button className="btn btn-sm btn-primary" onClick={create} disabled={!form.title}>Create</button>
        </div>
      </section>
      <Err e={a.error} />{a.msg && <p className="small" role="status">{a.msg}</p>}
      {edit && (
        <section className="panel panel-pad">
          <h3>Questions in paper <code>{edit}</code></h3>
          <p className="small muted">One per line: <code>number,question_id,section_key</code>. Order and numbering follow the original paper.</p>
          <textarea rows={8} value={items} onChange={(e) => setItems(e.target.value)} aria-label="Paper questions" />
          <div className="row"><button className="btn btn-sm btn-primary" onClick={saveItems}>Save list</button><button className="btn btn-sm" onClick={() => setEdit(null)}>Close</button></div>
        </section>
      )}
      <div className="row"><select value={exam} onChange={(e) => setExam(e.target.value)} aria-label="Filter exam"><option value="">All exams</option>{tax.data?.exams.map((e: any) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</select></div>
      <div className="table-scroll panel">
        <table className="data small">
          <thead><tr><th>Paper</th><th>Exam</th><th>Kind</th><th>Year</th><th>Availability</th><th>Status</th><th>Metadata</th><th className="num">Q</th><th /></tr></thead>
          <tbody>
            {list.data?.papers.map((p: any) => (
              <tr key={p.public_id}>
                <td>{p.title}<br /><code>{p.public_id}</code></td><td>{p.exam}</td><td>{p.kind}</td><td>{p.year ?? '—'}</td>
                <td><select value={p.availability} onChange={(e) => patch(p.public_id, { availability: e.target.value }, 'Availability updated.')} aria-label="Availability"><option value="metadata_only">metadata only</option><option value="partial">partial</option><option value="full">full</option></select></td>
                <td><select value={p.status} onChange={(e) => patch(p.public_id, { status: e.target.value }, 'Status updated.')} aria-label="Status"><option>draft</option><option>published</option><option>archived</option></select></td>
                <td><select value={p.verification_status} onChange={(e) => patch(p.public_id, { verification_status: e.target.value }, 'Verification updated.')} aria-label="Verification"><option>unverified</option><option>verified</option><option>needs_correction</option></select></td>
                <td className="num">{p.questions}</td>
                <td><button className="btn btn-sm" onClick={() => openItems(p.public_id)}>Questions</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ sources & diagrams
function Sources() {
  const { data, reload } = useApi<any>('/api/admin/sources');
  const [f, setF] = useState({ source_type: 'licensed_dataset', title: '', license: '', permission_note: '', rights_holder: '', url: '' });
  const a = useAction();
  const create = () => a.run(async () => { await api.post('/api/admin/sources', Object.fromEntries(Object.entries(f).filter(([, v]) => v))); reload(); }, 'Source added.');
  return (
    <div className="stack">
      <h2>Sources &amp; rights</h2>
      <section className="panel panel-pad">
        <div className="row">
          <select value={f.source_type} onChange={(e) => setF({ ...f, source_type: e.target.value })} aria-label="Type">{['licensed_dataset', 'official_document', 'public_domain', 'original_sample', 'user_contribution'].map((s) => <option key={s}>{s}</option>)}</select>
          <input type="text" placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-label="Title" />
          <input type="text" placeholder="Licence" value={f.license} onChange={(e) => setF({ ...f, license: e.target.value })} aria-label="Licence" />
          <input type="text" placeholder="Rights holder" value={f.rights_holder} onChange={(e) => setF({ ...f, rights_holder: e.target.value })} aria-label="Rights holder" />
          <input type="text" placeholder="https://… (optional)" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} aria-label="URL" />
        </div>
        <input type="text" placeholder="Permission note: why may this content be used?" value={f.permission_note} onChange={(e) => setF({ ...f, permission_note: e.target.value })} style={{ width: '100%', marginTop: 8 }} aria-label="Permission note" />
        <p style={{ marginTop: 8 }}><button className="btn btn-sm btn-primary" onClick={create}>Add source</button></p>
        <Err e={a.error} />{a.msg && <p className="small" role="status">{a.msg}</p>}
      </section>
      <div className="table-scroll panel">
        <table className="data small"><thead><tr><th>#</th><th>Title</th><th>Type</th><th>Licence / permission</th><th className="num">Q</th></tr></thead>
          <tbody>{data?.sources.map((s: any) => <tr key={s.id}><td>{s.id}</td><td>{s.title}</td><td>{s.source_type}</td><td>{s.license}<br /><span className="muted">{s.permission_note}</span></td><td className="num">{s.questions}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}

function Diagrams() {
  const { data, reload } = useApi<any>('/api/admin/diagrams');
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [license, setLicense] = useState('');
  const a = useAction();
  const upload = () => a.run(async () => {
    if (!file) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const r = await api.post<any>('/api/admin/diagrams', { data_base64: btoa(bin), mime: file.type, alt_text: alt, license });
    reload();
    a.setMsg(`Uploaded. Use: ${r.markup}`);
  });
  return (
    <div className="stack">
      <h2>Diagrams</h2>
      <section className="panel panel-pad">
        <div className="row">
          <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Diagram file" />
          <input type="text" placeholder="Alt text (describe the diagram)" value={alt} onChange={(e) => setAlt(e.target.value)} style={{ flex: 1 }} aria-label="Alt text" />
          <input type="text" placeholder="Licence" value={license} onChange={(e) => setLicense(e.target.value)} aria-label="Licence" />
          <button className="btn btn-sm btn-primary" onClick={upload} disabled={!file || alt.length < 10 || !license}>Upload</button>
        </div>
        <Err e={a.error} />{a.msg && <p className="small" role="status"><code>{a.msg}</code></p>}
      </section>
      <div className="grid-cards">
        {data?.diagrams.map((d: any) => (
          <figure key={d.public_id} className="panel panel-pad" style={{ margin: 0 }}>
            <img src={d.url} alt={d.alt_text} style={{ maxWidth: '100%', background: '#fff' }} loading="lazy" />
            <figcaption className="small"><code>{`![…](diagram:${d.public_id})`}</code><br />{d.alt_text}<br /><span className="muted">{d.license}</span></figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ reports, audit, users
function Reports() {
  const [status, setStatus] = useState('open');
  const { data, reload } = useApi<any>(`/api/admin/reports?status=${status}`);
  const a = useAction();
  const update = (id: number, body: any) => a.run(async () => { await api.patch(`/api/admin/reports/${id}`, body); reload(); }, 'Report updated.');
  return (
    <div className="stack">
      <div className="row-between"><h2>Content reports</h2><select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">{['open', 'accepted', 'resolved', 'rejected', 'all'].map((s) => <option key={s}>{s}</option>)}</select></div>
      <Err e={a.error} />{a.msg && <p className="small" role="status">{a.msg}</p>}
      {data && !data.reports.length && <Empty title="No reports" />}
      {data?.reports.map((r: any) => (
        <section key={r.id} className="panel panel-pad" data-testid="report-row">
          <div className="row-between"><strong>{r.reason.replace('_', ' ')}</strong><span className="small muted">{fmtDateTime(r.created_at)} · {r.reporter ?? 'anonymous'} · <span className="badge">{r.status}</span></span></div>
          <p className="small">{r.details || <em>No details.</em>}</p>
          <p className="small muted">Question <Link to={`/admin/questions/${r.question}`}><code>{r.question}</code></Link>: {r.preview}</p>
          {r.resolution_note && <p className="small">Resolution: {r.resolution_note}</p>}
          <div className="row">
            <button className="btn btn-sm" onClick={() => update(r.id, { status: 'accepted', flag_question: true, resolution_note: 'Accepted; question flagged for correction.' })}>Accept &amp; flag question</button>
            <button className="btn btn-sm" onClick={() => { const n = prompt('Resolution note'); if (n !== null) update(r.id, { status: 'resolved', resolution_note: n || undefined }); }}>Resolve</button>
            <button className="btn btn-sm" onClick={() => { const n = prompt('Why is this rejected?'); if (n !== null) update(r.id, { status: 'rejected', resolution_note: n || undefined }); }}>Reject</button>
          </div>
        </section>
      ))}
    </div>
  );
}

function Audit() {
  const [sp] = useSearchParams();
  const { data } = useApi<any>(`/api/admin/audit${qs({ page: sp.get('page') })}`);
  return (
    <>
      <h2>Audit log</h2>
      <div className="table-scroll panel">
        <table className="data small" data-testid="audit-log">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>{data?.entries.map((e: any) => <tr key={e.id}><td>{fmtDateTime(e.created_at)}</td><td>{e.actor ?? 'system'}</td><td><code>{e.action}</code></td><td>{e.entity_type} {e.entity_id}</td><td><code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(e.details).slice(0, 200)}</code></td></tr>)}</tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} pages={data.pages} />}
    </>
  );
}

function Users() {
  const { data, error, reload } = useApi<any>('/api/admin/users');
  const a = useAction();
  if (error) return <ErrorState error={error} />;
  return (
    <>
      <h2>Users</h2>
      <Err e={a.error} />
      <div className="table-scroll panel">
        <table className="data small"><thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Joined</th></tr></thead>
          <tbody>{data?.users.map((u: any) => <tr key={u.id}><td>{u.email}</td><td>{u.display_name}</td><td>
            <select value={u.role} onChange={(e) => a.run(async () => { await api.patch(`/api/admin/users/${u.id}`, { role: e.target.value }); reload(); })} aria-label={`Role for ${u.email}`}><option>student</option><option>editor</option><option>admin</option></select>
          </td><td>{fmtDateTime(u.created_at)}</td></tr>)}</tbody></table>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ shell
export default function AdminApp() {
  const { user, ready } = useAuth();
  useHead('Admin', { noindex: true });
  if (!ready) return <Loading />;
  if (!user) return <Empty title="Admin sign-in required"><Link className="btn" to="/login?next=/admin">Sign in</Link></Empty>;
  if (user.role === 'student') return <Empty title="Access denied"><p>Your account does not have editor permissions.</p></Empty>;
  const links: [string, string][] = [['', 'Dashboard'], ['questions', 'Questions'], ['imports', 'Imports'], ['taxonomy', 'Taxonomy'], ['papers', 'Papers'], ['sources', 'Sources'], ['diagrams', 'Diagrams'], ['reports', 'Reports'], ['audit', 'Audit log'], ...(user.role === 'admin' ? [['users', 'Users'] as [string, string]] : [])];
  return (
    <div className="admin-layout">
      <nav className="admin-nav panel panel-pad" aria-label="Admin">
        {links.map(([to, l]) => <NavLink key={to} to={`/admin${to ? '/' + to : ''}`} end={!to} className={({ isActive }) => (isActive ? 'active' : '')}>{l}</NavLink>)}
      </nav>
      <div>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="questions" element={<QuestionList />} />
          <Route path="questions/:pid" element={<QuestionEditor />} />
          <Route path="imports" element={<Imports />} />
          <Route path="taxonomy" element={<Taxonomy />} />
          <Route path="papers" element={<Papers />} />
          <Route path="sources" element={<Sources />} />
          <Route path="diagrams" element={<Diagrams />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit" element={<Audit />} />
          <Route path="users" element={<Users />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}
