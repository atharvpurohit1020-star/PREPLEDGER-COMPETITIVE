import { Link, useLocation } from 'react-router-dom';

export function Pagination({ page, pages }: { page: number; pages: number }) {
  const loc = useLocation();
  if (pages <= 1) return null;
  const href = (p: number) => {
    const s = new URLSearchParams(loc.search);
    if (p === 1) s.delete('page');
    else s.set('page', String(p));
    const q = s.toString();
    return loc.pathname + (q ? `?${q}` : '');
  };
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const list = [...nums].sort((a, b) => a - b);
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? <Link to={href(page - 1)} rel="prev">‹ Prev</Link> : <span className="disabled">‹ Prev</span>}
      {list.map((n, i) => (
        <span key={n} style={{ display: 'contents' }}>
          {i > 0 && n - list[i - 1] > 1 && <span className="disabled">…</span>}
          {n === page ? <span aria-current="page">{n}</span> : <Link to={href(n)}>{n}</Link>}
        </span>
      ))}
      {page < pages ? <Link to={href(page + 1)} rel="next">Next ›</Link> : <span className="disabled">Next ›</span>}
    </nav>
  );
}
