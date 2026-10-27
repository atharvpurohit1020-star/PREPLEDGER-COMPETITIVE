import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';

const REASONS = [
  ['wrong_answer', 'Answer key looks wrong'],
  ['typo', 'Typo or wording error'],
  ['rendering', 'Formula / layout does not display correctly'],
  ['missing_diagram', 'Diagram missing or unclear'],
  ['other', 'Something else'],
] as const;

export function ReportDialog({ questionId, onClose }: { questionId: string; onClose: () => void }) {
  const [reason, setReason] = useState<string>('wrong_answer');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const first = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    first.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    setError(null);
    try {
      await api.post('/api/reports', { question: questionId, reason, details: details || undefined });
      setState('sent');
    } catch (err) {
      setError((err as ApiError).message);
      setState('idle');
    }
  };
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" onSubmit={submit}>
        <h2 id="report-title">Report a problem</h2>
        {state === 'sent' ? (
          <>
            <p className="notice notice-success" role="status">Thanks — the editors will review this question.</p>
            <button type="button" className="btn" onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <label className="field"><span>What is wrong?</span>
              <select ref={first} value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="field"><span>Details (optional)</span>
              <textarea rows={4} value={details} maxLength={2000} onChange={(e) => setDetails(e.target.value)} style={{ fontFamily: 'inherit' }} />
            </label>
            {error && <p className="errors" role="alert">{error}</p>}
            <div className="row">
              <button className="btn btn-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send report'}</button>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
