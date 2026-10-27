import { Link } from 'react-router-dom';
import { QUESTION_TYPE_LABELS, type QuestionType } from '../../shared/types';
import { ErrorState, Loading } from '../components/States';
import { fmtDateTime, papersPath } from '../lib/format';
import { useHead } from '../lib/head';
import { useApi } from '../lib/useApi';

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export function CoveragePage() {
  useHead('Content coverage report');
  const { data, error, loading, reload } = useApi<any>('/api/coverage');
  if (loading) return <Loading lines={10} />;
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data) return null;
  const cat = (slug: string) => (slug === 'neet' ? 'medical' : 'jee');
  return (
    <>
      <div className="page-title"><h1>Content coverage</h1><span className="small muted">Generated {fmtDateTime(data.generated_at)}</span></div>
      <p className="notice">This report shows exactly what is in the database. A chapter or paper with no questions means content has not been imported yet, not that the exam never asked about it.</p>
      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><h2>By exam</h2></div>
        <div className="table-scroll">
          <table className="data" data-testid="coverage-exams">
            <thead><tr><th>Exam</th><th className="num">Published Q</th><th className="num">Past-year Q</th><th className="num">Verified</th><th className="num">Drafts</th><th className="num">Chapters with Q</th><th className="num">Past papers listed</th><th className="num">… with questions</th><th className="num">Sample sets</th></tr></thead>
            <tbody>
              {data.exams.map((e: any) => (
                <tr key={e.slug}>
                  <td><Link to={`/past-years/${cat(e.slug)}/${e.slug}`}>{e.name}</Link>{!e.on_reference && <span className="badge" style={{ marginLeft: 6 }}>Extension</span>}</td>
                  <td className="num">{e.published}</td><td className="num">{e.pyq}</td><td className="num">{e.verified}</td><td className="num">{e.unpublished}</td>
                  <td className="num">{e.chapters_with_questions}/{e.chapters} ({pct(e.chapters_with_questions, e.chapters)})</td>
                  <td className="num"><Link to={papersPath(cat(e.slug), e.slug)}>{e.past_papers}</Link></td>
                  <td className="num">{Number(e.past_papers_full) + Number(e.past_papers_partial)}</td>
                  <td className="num">{e.sample_papers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><h2>By subject</h2></div>
        <div className="table-scroll">
          <table className="data">
            <thead><tr><th>Exam</th><th>Subject</th><th className="num">Questions</th><th className="num">Past-year</th><th className="num">Chapters with Q</th></tr></thead>
            <tbody>{data.subjects.map((s: any) => <tr key={s.exam + s.slug}><td>{s.exam}</td><td><Link to={`/past-years/${cat(s.exam)}/${s.exam}/${s.slug}`}>{s.name}</Link></td><td className="num">{s.questions}</td><td className="num">{s.pyq}</td><td className="num">{s.chapters_with_questions}/{s.chapters}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><h2>By paper</h2></div>
        <div className="table-scroll">
          <table className="data">
            <thead><tr><th>Exam</th><th>Year</th><th>Paper</th><th>Kind</th><th>Availability</th><th>Metadata</th><th className="num">Questions</th></tr></thead>
            <tbody>{data.papers.map((p: any) => <tr key={p.public_id}><td>{p.exam}</td><td>{p.year ?? '—'}</td><td>{p.title}</td><td>{p.kind.replace('_', ' ')}</td><td>{p.availability.replace('_', ' ')}</td><td>{p.verification_status}</td><td className="num">{p.questions}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <div className="layout-2col halves" style={{ marginTop: 12 }}>
        <section className="panel">
          <div className="panel-head"><h2>Sources</h2></div>
          <table className="data"><thead><tr><th>Source</th><th>Type</th><th className="num">Questions</th></tr></thead>
            <tbody>{data.sources.map((s: any, i: number) => <tr key={i}><td>{s.title}<br /><span className="small muted">{s.license}</span></td><td>{s.source_type.replace('_', ' ')}</td><td className="num">{s.questions}</td></tr>)}</tbody></table>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Question types</h2></div>
          <table className="data"><tbody>{data.types.map((t: any) => <tr key={t.type}><td>{QUESTION_TYPE_LABELS[t.type as QuestionType]}</td><td className="num">{t.n}</td></tr>)}</tbody></table>
        </section>
      </div>
    </>
  );
}
