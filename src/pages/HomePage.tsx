import { Link } from 'react-router-dom';
import { useExamList } from '../components/Layout';
import { ErrorState, Loading } from '../components/States';
import { examPath, papersPath } from '../lib/format';
import { useHead } from '../lib/head';
import { STATIC_DEMO } from '../lib/flags';

export function HomePage() {
  useHead('Previous year questions for JEE, NEET and engineering entrances', { description: 'Chapter-wise and paper-wise questions with answers, solutions, statistics and practice tests.' });
  const { data, error, loading, reload } = useExamList();
  const totalQ = data?.categories.flatMap((c) => c.exams).reduce((a, e) => a + Number(e.question_count), 0) ?? 0;
  const totalPyq = data?.categories.flatMap((c) => c.exams).reduce((a, e) => a + Number((e as any).pyq_count ?? 0), 0) ?? 0;
  return (
    <>
      <div className="page-title">
        <h1>Exam question bank</h1>
        <span className="muted small">Chapter-wise and paper-wise · answers · solutions · practice tests</span>
      </div>
      {data && totalPyq === 0 && (
        <p className="notice notice-warn" data-testid="content-notice">
          <strong>Content status:</strong> no past-year questions have been imported yet. The {totalQ} questions currently published are <strong>original sample questions</strong> written to demonstrate the platform; they are labelled “Sample · not a PYQ”. Past-paper listings show which papers exist, and each is marked unavailable until licensed content is imported. See <Link to="/coverage">coverage</Link>.
        </p>
      )}
      {STATIC_DEMO && (
        <p className="notice small" data-testid="preview-notice">
          <strong>Static preview.</strong> This copy runs entirely in your browser from a snapshot of the question bank. Browsing, search, filters, answers, solutions and timed tests work. Accounts, bookmarks, admin, reports and PDF export need the full server.
        </p>
      )}
      {loading && <Loading />}
      {error && <ErrorState error={error} retry={reload} />}
      {data?.categories.map((c) => (
        <section key={c.slug} className="panel panel-pad" style={{ marginTop: 12 }} aria-labelledby={`cat-${c.slug}`}>
          <h2 id={`cat-${c.slug}`}>{c.name}</h2>
          <div className="grid-cards">
            {c.exams.map((e: any) => (
              <div key={e.slug} className="exam-card" data-testid="exam-card">
                <Link to={examPath(c.slug, e.slug)} className="name">{e.name}</Link>
                {!e.on_reference && <span className="badge" style={{ marginLeft: 6 }} title="Added beyond the reference site's exam list">Extension</span>}
                <div className="small muted">{e.region} · {e.question_count} questions{e.pyq_count ? ` (${e.pyq_count} PYQ)` : ''} · {e.past_paper_count} past papers listed</div>
                <div className="links">
                  <Link to={examPath(c.slug, e.slug)}>Chapter-wise</Link>
                  <Link to={papersPath(c.slug, e.slug)}>Paper-wise</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
