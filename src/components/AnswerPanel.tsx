import { useState } from 'react';
import { formatAnswer } from '../../shared/scoring';
import { ANSWER_SOURCE_LABELS, ANSWER_STATUS_LABELS } from '../../shared/types';
import { fmtDate } from '../lib/format';
import type { Question } from '../lib/types';
import { Content } from './Content';

export function KeyBadges({ k }: { k: NonNullable<Question['answer']> }) {
  const statusClass = k.status === 'final' ? 'badge-success' : k.status === 'disputed' ? 'badge-danger' : k.status === 'dropped' ? 'badge-warn' : 'badge-primary';
  return (
    <span className="row" style={{ gap: 4 }}>
      <span className={`badge ${k.source === 'official' ? 'badge-success' : ''}`} data-testid="key-source">{ANSWER_SOURCE_LABELS[k.source]}</span>
      <span className={`badge ${statusClass}`} data-testid="key-status">{ANSWER_STATUS_LABELS[k.status]}</span>
    </span>
  );
}

export function AnswerBox({ q, showSolutions }: { q: Question; showSolutions: boolean }) {
  const [history, setHistory] = useState(false);
  const k = q.answer;
  return (
    <div className="answer-box" data-testid="answer-box">
      <div className="row-between">
        {k ? (
          <span>
            <strong>Answer: </strong>
            <span data-testid="correct-answer">{k.status === 'dropped' ? 'Dropped' : formatAnswer(k.value)}</span>
          </span>
        ) : (
          <span className="muted">No answer key is available for this question yet.</span>
        )}
        {k && <KeyBadges k={k} />}
      </div>
      {k?.status === 'dropped' && <p className="notice notice-warn" style={{ margin: 8 }}>This question was dropped; full marks are awarded to every candidate.{k.note ? ` ${k.note}` : ''}</p>}
      {k?.status === 'disputed' && <p className="notice notice-danger" style={{ margin: 8 }}>The answer to this question is disputed.{k.note ? ` ${k.note}` : ''}</p>}
      {k && k.status !== 'dropped' && k.status !== 'disputed' && k.note && <p className="small muted" style={{ margin: '6px 12px' }}>{k.note}</p>}
      {q.answer_history && q.answer_history.length > 1 && (
        <div className="history">
          <button className="btn-link small" onClick={() => setHistory((h) => !h)} aria-expanded={history}>
            {history ? 'Hide' : 'Show'} answer-key history ({q.answer_history.length} versions)
          </button>
          {history && (
            <ol data-testid="key-history">
              {q.answer_history.map((h) => (
                <li key={h.version}>
                  v{h.version}: <strong>{formatAnswer(h.value)}</strong> — {ANSWER_STATUS_LABELS[h.status]}, {ANSWER_SOURCE_LABELS[h.source]}
                  {h.effective_at ? ` (${fmtDate(h.effective_at)})` : ''}{h.is_current ? ' · current' : ''}{h.note ? ` — ${h.note}` : ''}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      {showSolutions && (
        <div data-testid="solutions">
          {(q.solutions ?? []).length === 0 ? (
            <p className="solution muted" style={{ fontFamily: 'var(--font)' }}>No solution is available for this question yet.</p>
          ) : (
            q.solutions!.map((s) => (
              <div className="solution" key={s.id}>
                <div className="solution-head">
                  <strong>{s.method_label ?? 'Solution'}</strong>
                  <span className={`badge ${s.kind === 'official' ? 'badge-success' : ''}`}>{s.kind === 'official' ? 'Official solution' : s.kind === 'editorial' ? 'Editorial solution (not official)' : 'Community solution'}</span>
                  {s.is_verified ? <span className="badge badge-success">Reviewed</span> : <span className="badge">Not yet reviewed</span>}
                  {s.author_name && <span>· {s.author_name}</span>}
                </div>
                <Content src={s.body} diagrams={q.diagrams} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
