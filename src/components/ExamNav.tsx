import { Link } from 'react-router-dom';
import { examPath, papersPath, subjectPath } from '../lib/format';

export function ModeTabs({ category, exam, active }: { category: string; exam: string; active: 'chapter' | 'paper' }) {
  return (
    <nav className="tabs" aria-label="Browse mode">
      <Link to={examPath(category, exam)} aria-current={active === 'chapter' ? 'page' : undefined}>Chapter-wise</Link>
      <Link to={papersPath(category, exam)} aria-current={active === 'paper' ? 'page' : undefined}>Paper-wise</Link>
    </nav>
  );
}

export function SubjectTabs({ category, exam, subjects, active }: { category: string; exam: string; subjects: { slug: string; name: string }[]; active?: string }) {
  return (
    <nav className="tabs" aria-label="Subjects">
      <Link to={examPath(category, exam)} aria-current={!active ? 'page' : undefined}>All subjects</Link>
      {subjects.map((s) => (
        <Link key={s.slug} to={subjectPath(category, exam, s.slug)} aria-current={active === s.slug ? 'page' : undefined}>{s.name}</Link>
      ))}
    </nav>
  );
}

export function SyllabusBadge({ syllabus }: { syllabus: { status: string; version: string; verified: boolean; note?: string }[] | null | undefined }) {
  if (!syllabus?.length) return null;
  return (
    <>
      {syllabus.map((s, i) => (
        <span key={i} className={`badge ${s.status === 'removed' ? 'badge-danger' : 'badge-warn'}`} title={`${s.version}${s.note ? ' — ' + s.note : ''}`}>
          {s.status === 'removed' ? 'Removed from syllabus' : s.status === 'reduced' ? 'Reduced in syllabus' : 'In syllabus'}{s.verified ? '' : ' (unverified)'}
        </span>
      ))}
    </>
  );
}
