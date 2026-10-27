import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toPlainText } from '../../shared/content';
import { checkResponse } from '../../shared/scoring';
import type { Response } from '../../shared/types';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { STATIC_DEMO } from '../lib/flags';
import { fmtDate, paperPath, questionPath } from '../lib/format';
import type { Question } from '../lib/types';
import { AnswerBox } from './AnswerPanel';
import { Content } from './Content';
import { ReportDialog } from './ReportDialog';

export const SINGLE_TYPES = new Set(['mcq_single', 'matrix_match', 'assertion_reason']);
export const NUMERIC_TYPES = new Set(['numerical', 'integer']);

export function QuestionMeta({ q, paperContext }: { q: Question; paperContext?: string }) {
  const papers = paperContext ? q.papers.filter((p) => p.public_id !== paperContext) : q.papers;
  return (
    <span className="q-tags">
      {q.is_pyq ? <span className="badge badge-primary">Past-year question</span> : <span className="badge badge-warn" title="Written for PrepLedger; not from an exam paper">Sample · not a PYQ</span>}
      <span className="badge">{q.type_label}</span>
      {papers.map((p) => (
        <Link key={p.public_id} className="badge" to={paperPath(q.exam.category, q.exam.slug, p.slug, p.public_id)} title={p.title}>
          {p.kind === 'past_paper' ? `${p.title}${p.exam_date ? ` · ${fmtDate(p.exam_date)}` : ''}` : p.title} · Q{p.question_number}
        </Link>
      ))}
      {q.verification_status === 'verified' && <span className="badge badge-success">Verified</span>}
      {q.verification_status === 'needs_correction' && <span className="badge badge-danger">Under correction</span>}
    </span>
  );
}

export function Matrix({ q }: { q: Question }) {
  if (!q.matrix) return null;
  const side = (title: string | undefined, rows: { key: string; body: string }[]) => (
    <div className="table-wrap">
      <table className="q-table">
        <thead><tr><th colSpan={2}>{title}</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.key}><td><strong>{r.key}</strong></td><td><Content as="span" src={r.body} diagrams={q.diagrams} /></td></tr>)}</tbody>
      </table>
    </div>
  );
  return (
    <div className="matrix-lists" style={{ padding: '0 14px' }}>
      {side(q.matrix.left_title ?? 'List-I', q.matrix.left)}
      {side(q.matrix.right_title ?? 'List-II', q.matrix.right)}
    </div>
  );
}

const shortOptions = (q: Question) => q.options.every((o) => toPlainText(o.body).length < 38 && !o.body.includes('$$'));

interface Props {
  q: Question;
  number?: number | string;
  ctx?: { kind: 'chapter' | 'paper'; paper?: string };
  practice?: { response: Response; is_correct: boolean } | null;
  defaultRevealed?: boolean;
  headingLevel?: 'h2' | 'h3';
  showDetailLink?: boolean;
}

export function QuestionCard({ q, number, ctx, practice, defaultRevealed = false, showDetailLink = true }: Props) {
  const { user, bookmarks, toggleBookmark } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const initial = practice?.response ?? null;
  const [selected, setSelected] = useState<string[]>(initial && 'options' in initial ? initial.options : []);
  const [numeric, setNumeric] = useState<string>(initial && 'value' in initial ? String(initial.value) : '');
  const [checked, setChecked] = useState<null | boolean>(practice ? practice.is_correct : null);
  const [revealed, setRevealed] = useState(defaultRevealed);
  const [solutions, setSolutions] = useState(defaultRevealed);
  const [report, setReport] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const touched = useRef(false);
  // saved practice state usually arrives after mount; apply it unless the user has already interacted
  useEffect(() => {
    if (!practice || touched.current) return;
    const r = practice.response;
    if (r && 'options' in r) setSelected(r.options);
    if (r && 'value' in r) setNumeric(String(r.value));
    setChecked(practice.is_correct);
  }, [practice]);

  const selectable = q.options.length > 0;
  const multi = q.type === 'mcq_multi';
  const response: Response = NUMERIC_TYPES.has(q.type) ? (numeric.trim() !== '' && Number.isFinite(Number(numeric)) ? { value: Number(numeric) } : null) : selected.length ? { options: selected } : null;
  const key = q.answer;
  const correctSet = new Set(key && 'options' in key.value ? key.value.options : []);
  const showResult = checked !== null || revealed;

  const choose = (label: string) => {
    touched.current = true;
    if (checked !== null) {
      setChecked(null);
      setMsg(null);
    }
    setSelected((s) => (multi ? (s.includes(label) ? s.filter((x) => x !== label) : [...s, label].sort()) : [label]));
  };

  const check = async () => {
    if (!response || !key) return;
    const ok = key.status === 'dropped' ? true : checkResponse(q.type, key.value, response);
    setChecked(ok);
    setMsg(null);
    if (user) {
      try {
        await api.post(`/api/me/practice/${q.public_id}`, { response });
      } catch {
        setMsg('Your answer was checked but could not be saved to your history.');
      }
    }
  };

  const bookmark = async () => {
    if (!user) return nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`);
    try {
      const on = await toggleBookmark(q.public_id);
      setMsg(on ? 'Bookmarked.' : 'Bookmark removed.');
    } catch {
      setMsg('Could not update the bookmark. Please try again.');
    }
  };

  const optClass = (label: string) => {
    const cls = ['option'];
    if (selected.includes(label)) cls.push('selected');
    if (showResult && key && key.status !== 'dropped') {
      if (correctSet.has(label) && (revealed || checked !== null)) cls.push('correct');
      else if (checked !== null && selected.includes(label)) cls.push('wrong');
    }
    return cls.join(' ');
  };

  const paperNum = ctx?.kind === 'paper' ? q.papers.find((p) => p.public_id === ctx.paper)?.question_number : undefined;
  return (
    <article className="q-card" id={`q-${q.public_id}`} data-testid="question-card" data-qid={q.public_id} aria-labelledby={`qh-${q.public_id}`}>
      <header className="q-head">
        <span className="q-num" id={`qh-${q.public_id}`}>{number != null ? `Question ${number}` : paperNum ? `Q${paperNum}` : 'Question'}</span>
        <QuestionMeta q={q} paperContext={ctx?.paper} />
      </header>
      {q.passage && (
        <div className="q-passage">
          <div className="label">{q.passage.title ?? 'Passage'}</div>
          <Content src={q.passage.body} diagrams={q.diagrams} />
        </div>
      )}
      <div className="q-body"><Content src={q.body} diagrams={q.diagrams} /></div>
      <Matrix q={q} />
      {selectable && (
        <ul className={`options ${shortOptions(q) ? 'cols-2' : ''}`} role={multi ? 'group' : 'radiogroup'} aria-label={multi ? 'Options (select all that apply)' : 'Options'}>
          {q.options.map((o) => (
            <li key={o.label}>
              <button type="button" className={optClass(o.label)} onClick={() => choose(o.label)} role={multi ? 'checkbox' : 'radio'} aria-checked={selected.includes(o.label)} data-option={o.label}>
                <span className="opt-label">{o.label}</span>
                <span className="opt-body"><Content as="span" src={o.body} diagrams={q.diagrams} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {NUMERIC_TYPES.has(q.type) && (
        <div className="num-input">
          <label htmlFor={`num-${q.public_id}`} className="small muted">Your answer</label>
          <input id={`num-${q.public_id}`} type="number" step="any" inputMode="decimal" value={numeric} onChange={(e) => { touched.current = true; setNumeric(e.target.value); setChecked(null); }} data-testid="numeric-input" />
        </div>
      )}
      {checked !== null && (
        <p className={`q-feedback notice ${checked ? 'notice-success' : 'notice-danger'}`} role="status" data-testid="feedback">
          {checked ? 'Correct!' : multi && response && 'options' in response && response.options.every((o) => correctSet.has(o)) ? 'Partially correct — some correct options are missing.' : 'Incorrect.'}
          {!revealed && <> <button className="btn-link" onClick={() => setRevealed(true)}>Show answer</button></>}
        </p>
      )}
      {(revealed || solutions) && <AnswerBox q={q} showSolutions={solutions} />}
      {msg && <p className="small muted" style={{ margin: '0 14px 8px' }} role="status">{msg}</p>}
      <div className="q-actions">
        <button className="btn btn-primary btn-sm" onClick={check} disabled={!response || !key} data-testid="check-answer">Check answer</button>
        <button className="btn btn-sm" onClick={() => setRevealed((r) => !r)} aria-expanded={revealed} data-testid="toggle-answer">{revealed ? 'Hide answer' : 'Show answer'}</button>
        <button className="btn btn-sm" onClick={() => setSolutions((s) => !s)} aria-expanded={solutions} data-testid="toggle-solution">{solutions ? 'Hide solution' : 'Solution'}</button>
        {(selected.length > 0 || numeric) && <button className="btn btn-sm" onClick={() => { setSelected([]); setNumeric(''); setChecked(null); }}>Clear</button>}
        <span className="spacer" />
        {!STATIC_DEMO && <button className="btn btn-sm" onClick={bookmark} aria-pressed={bookmarks.has(q.public_id)} data-testid="bookmark">{bookmarks.has(q.public_id) ? '★ Bookmarked' : '☆ Bookmark'}</button>}
        {!STATIC_DEMO && <button className="btn btn-sm" onClick={() => setReport(true)}>Report</button>}
        {showDetailLink && <Link className="btn btn-sm" to={questionPath(q.public_id, ctx)}>Open ›</Link>}
      </div>
      <div className="q-source">Source: {q.source.title} · {q.source.license}</div>
      {report && <ReportDialog questionId={q.public_id} onClose={() => setReport(false)} />}
    </article>
  );
}
