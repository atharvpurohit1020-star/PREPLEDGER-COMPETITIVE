import { Link } from 'react-router-dom';
import type { ApiError } from '../lib/api';
import { useHead } from '../lib/head';

export function Loading({ label = 'Loading…', lines = 4 }: { label?: string; lines?: number }) {
  return (
    <div role="status" aria-live="polite" className="panel panel-pad">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function NotFound({ message }: { message?: string }) {
  useHead('Page not found', { noindex: true });
  return (
    <div className="panel state" data-testid="not-found">
      <h1>Page not found</h1>
      <p>{message ?? 'The page you are looking for does not exist or has moved.'}</p>
      <p className="row" style={{ justifyContent: 'center' }}>
        <Link className="btn" to="/">Go to all exams</Link>
        <Link className="btn" to="/search">Search questions</Link>
      </p>
    </div>
  );
}

export function ErrorState({ error, retry }: { error: ApiError; retry?: () => void }) {
  if (error.status === 404) return <NotFound message={error.message} />;
  return (
    <div className="notice notice-danger" role="alert" data-testid="error-state">
      <p><strong>Something went wrong.</strong> {error.message}</p>
      {retry && <button className="btn btn-sm" onClick={retry}>Try again</button>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="panel state" data-testid="empty-state">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
