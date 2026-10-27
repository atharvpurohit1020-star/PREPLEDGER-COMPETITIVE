import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { STATIC_DEMO } from '../lib/flags';
import { examPath, papersPath } from '../lib/format';
import { useApi } from '../lib/useApi';
import { Lightbox } from './Lightbox';

interface ExamList { categories: { slug: string; name: string; exams: { slug: string; name: string; question_count: number; on_reference: boolean }[] }[] }

export function useExamList() {
  return useApi<ExamList>('/api/exams');
}

function ExamMenu({ onClose }: { onClose: () => void }) {
  const { data, error } = useExamList();
  return (
    <div className="exam-menu" id="exam-menu">
      <div className="exam-menu-inner">
        {error && <p className="errors">Could not load exams: {error.message}</p>}
        {data?.categories.map((c) => (
          <div key={c.slug}>
            <h4>{c.name}</h4>
            <ul>
              {c.exams.map((e) => (
                <li key={e.slug}>
                  <Link to={examPath(c.slug, e.slug)} onClick={onClose}>
                    <span>{e.name}</span>
                    <span className="muted small">{e.question_count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header() {
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const loc = useLocation();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    setMenu(false);
    setMobile(false);
  }, [loc.pathname, loc.search]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    nav(`/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };
  return (
    <header className="header" ref={ref}>
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="PrepLedger home"><span className="brand-mark" aria-hidden="true">P</span>PrepLedger</Link>
        <button className="btn btn-sm menu-toggle" aria-expanded={mobile} aria-controls="main-nav" onClick={() => setMobile((m) => !m)}>☰ Menu</button>
        <nav className={`nav ${mobile ? 'open' : ''}`} id="main-nav" aria-label="Main">
          <button className="navlink" aria-expanded={menu} aria-controls="exam-menu" onClick={() => setMenu((m) => !m)}>Exams ▾</button>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/practice">Practice</NavLink>
          <NavLink to="/coverage">Coverage</NavLink>
          {user && user.role !== 'student' && <NavLink to="/admin">Admin</NavLink>}
          <span className="nav-spacer" />
          <form className="header-search" role="search" onSubmit={submit}>
            <label htmlFor="header-q" className="sr-only">Search questions</label>
            <input id="header-q" type="search" placeholder="Search questions, chapters…" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          {STATIC_DEMO ? <span className="badge badge-warn" title="Static preview: accounts, admin and PDF need the full server">Preview</span> : user ? <NavLink to="/account">{user.display_name}</NavLink> : <NavLink to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`}>Sign in</NavLink>}
        </nav>
      </div>
      {menu && <ExamMenu onClose={() => setMenu(false)} />}
    </header>
  );
}

function Footer() {
  const { data } = useExamList();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        {data?.categories.map((c) => (
          <div key={c.slug}>
            <h4>{c.name}</h4>
            <ul>
              {c.exams.map((e) => (
                <li key={e.slug}><Link to={examPath(c.slug, e.slug)}>{e.name}</Link> · <Link to={papersPath(c.slug, e.slug)}>Papers</Link></li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4>PrepLedger</h4>
          <ul>
            <li><Link to="/about">About &amp; content policy</Link></li>
            <li><Link to="/coverage">Content coverage</Link></li>
            <li><Link to="/search">Search</Link></li>
            <li><Link to="/practice">Practice tests</Link></li>
          </ul>
          <p className="small" style={{ marginTop: 8 }}>Independent study platform. Not affiliated with NTA, the IITs or any examination authority.</p>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main" className="page"><div className="container">{children}</div></main>
      <Footer />
      <Lightbox />
    </>
  );
}
