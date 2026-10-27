import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ModeTabs } from '../components/ExamNav';
import { Empty, ErrorState, Loading, NotFound } from '../components/States';
import { examPath, fmtDate, paperPath } from '../lib/format';
import { useHead } from '../lib/head';
import { useApi } from '../lib/useApi';

export function AvailabilityBadge({ p }: { p: { availability: string; question_count: number } }) {
  if (p.availability === 'metadata_only' || Number(p.question_count) === 0) return <span className="badge badge-danger" data-testid="unavailable">Questions not available</span>;
  if (p.availability === 'partial') return <span className="badge badge-warn">Partial · {p.question_count} Q</span>;
  return <span className="badge badge-success">{p.question_count} questions</span>;
}

export function PaperListPage() {
  const { category = '', exam = '' } = useParams();
  const { data, error, loading, reload } = useApi<any>(`/api/exams/${exam}/papers`);
  useHead(data ? `${data.exam.name} previous year papers year-wise` : null);
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data) return null;
  if (data.exam.category.slug !== category) return <NotFound />;
  const pp = (p: any) => paperPath(category, exam, p.slug, p.public_id);
  return (
    <>
      <Breadcrumbs items={[{ label: data.exam.name, to: examPath(category, exam) }, { label: 'Papers' }]} />
      <div className="page-title"><h1>{data.exam.name} papers</h1></div>
      <ModeTabs category={category} exam={exam} active="paper" />
      {data.years.length === 0 && data.samples.length === 0 && <Empty title="No papers listed yet"><p>No past papers have been recorded for {data.exam.name}.</p></Empty>}
      {data.years.length > 0 && (
        <p className="notice small">Papers marked “Questions not available” are listed so you can see what exists; their questions have not been imported from a licensed source. No paper is generated or reconstructed.</p>
      )}
      {data.years.map((g: any) => (
        <section key={g.year} className="panel" style={{ marginTop: 12 }} aria-labelledby={`y-${g.year}`}>
          <div className="panel-head"><h2 id={`y-${g.year}`}>{g.label}</h2><span className="small muted">{g.papers.length} papers</span></div>
          <div className="table-scroll">
            <table className="data">
              <thead><tr><th>Paper</th><th>Session</th><th>Date</th><th>Shift</th><th>Status</th><th className="no-print">Actions</th></tr></thead>
              <tbody>
                {g.papers.map((p: any) => (
                  <tr key={p.public_id} data-testid="paper-row">
                    <td><Link to={pp(p)}>{p.title}</Link>{p.verification_status !== 'verified' && <span className="badge" style={{ marginLeft: 6 }} title="Paper metadata has not been verified against an official notice">metadata unverified</span>}</td>
                    <td>{p.session ?? '—'}</td>
                    <td>{fmtDate(p.exam_date)}</td>
                    <td>{p.shift ?? '—'}</td>
                    <td><AvailabilityBadge p={p} /></td>
                    <td className="no-print">
                      {Number(p.question_count) > 0 ? (
                        <span className="row"><Link className="btn btn-sm" to={pp(p)}>View</Link><Link className="btn btn-sm" to={`/test/paper/${p.public_id}`}>Take test</Link></span>
                      ) : <span className="muted small">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {data.samples.length > 0 && (
        <section className="panel" style={{ marginTop: 12 }}>
          <div className="panel-head"><h2>Sample practice sets</h2><span className="badge badge-warn">Original · not past papers</span></div>
          <div className="table-scroll">
            <table className="data">
              <thead><tr><th>Set</th><th>Duration</th><th>Status</th><th className="no-print">Actions</th></tr></thead>
              <tbody>
                {data.samples.map((p: any) => (
                  <tr key={p.public_id} data-testid="paper-row">
                    <td><Link to={pp(p)}>{p.title}</Link></td>
                    <td>{p.duration_minutes ? `${p.duration_minutes} min` : '—'}</td>
                    <td><AvailabilityBadge p={p} /></td>
                    <td className="no-print"><span className="row"><Link className="btn btn-sm" to={pp(p)}>View</Link><Link className="btn btn-sm" to={`/test/paper/${p.public_id}`}>Take test</Link></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
