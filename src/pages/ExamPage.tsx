import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ModeTabs, SubjectTabs, SyllabusBadge } from '../components/ExamNav';
import { ErrorState, Loading, NotFound } from '../components/States';
import { chapterPath, papersPath, paperPath, subjectPath } from '../lib/format';
import { useHead } from '../lib/head';
import { useApi } from '../lib/useApi';
import { MarkingSchemeTable } from './PaperPage';

export function ChapterUnits({ units, category, exam, subject, showWeight }: { units: any[]; category: string; exam: string; subject: string; showWeight?: boolean }) {
  return (
    <>
      {units.map((u) => (
        <div className="unit" key={u.name}>
          <h3>{u.name}</h3>
          <ul className="chapter-list">
            {u.chapters.map((c: any) => (
              <li key={c.slug} className={c.question_count ? '' : 'empty'} data-testid="chapter-item">
                <span>
                  <Link to={chapterPath(category, exam, subject, c.slug)}>{c.name}</Link> <SyllabusBadge syllabus={c.syllabus} />
                </span>
                <span className="count" title={c.question_count ? `${c.question_count} published questions${c.pyq_count ? `, ${c.pyq_count} past-year` : ''}` : 'No questions imported yet'}>
                  {c.question_count ? `${c.question_count} Q${showWeight && c.weightage != null ? ` · ${(c.weightage * 100).toFixed(0)}%` : ''}` : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export function ExamPage() {
  const { category = '', exam = '' } = useParams();
  const { data, error, loading, reload } = useApi<any>(`/api/exams/${exam}`);
  useHead(data ? `${data.exam.name} previous year questions chapter-wise` : null, { description: data?.exam.description });
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data) return null;
  if (data.exam.category.slug !== category) return <NotFound />;
  const e = data.exam;
  return (
    <>
      <Breadcrumbs items={[{ label: e.category.name }, { label: e.name }]} />
      <div className="page-title">
        <h1>{e.name} <span className="muted" style={{ fontWeight: 400, fontSize: '1rem' }}>{e.full_name}</span></h1>
      </div>
      <div className="meta-line" style={{ marginBottom: 10 }}>
        <span>{e.conducting_body}</span><span>{e.region}</span>
        <span>{data.totals.questions} questions ({data.totals.pyq} past-year)</span>
        <span>{data.papers.past_paper_count} past papers listed · {data.papers.past_papers_with_questions} with questions</span>
      </div>
      <ModeTabs category={category} exam={exam} active="chapter" />
      {data.totals.pyq === 0 && (
        <p className="notice notice-warn">No past-year questions for {e.name} have been imported yet. Questions shown are original samples for practice. Chapters with no questions show “—”.</p>
      )}
      <div className="layout-2col aside-right aside-300">
        <div>
          <SubjectTabs category={category} exam={exam} subjects={data.subjects} />
          {data.subjects.map((s: any) => (
            <section key={s.slug} className="panel panel-pad" style={{ marginBottom: 12 }} aria-labelledby={`sub-${s.slug}`}>
              <div className="row-between">
                <h2 id={`sub-${s.slug}`}><Link to={subjectPath(category, exam, s.slug)}>{s.name}</Link></h2>
                <span className="small muted">{s.question_count} questions · {s.chapters_with_questions}/{s.chapter_count} chapters have questions</span>
              </div>
              <ChapterUnits units={s.units} category={category} exam={exam} subject={s.slug} />
            </section>
          ))}
        </div>
        <aside className="stack">
          <section className="panel panel-pad">
            <h2>Paper-wise</h2>
            {data.papers.years.length ? (
              <p className="small">Years listed: {data.papers.years.map((y: number, i: number) => <span key={y}>{i ? ', ' : ''}{y}</span>)}</p>
            ) : (
              <p className="small muted">No past papers are listed for this exam yet.</p>
            )}
            <Link className="btn btn-sm" to={papersPath(category, exam)}>Browse papers ›</Link>
          </section>
          <section className="panel panel-pad">
            <h2>Practice</h2>
            {data.papers.samples.length ? (
              <ul className="side-list">
                {data.papers.samples.map((p: any) => (
                  <li key={p.public_id}><Link to={paperPath(category, exam, p.slug, p.public_id)}>{p.title} <span className="muted">{p.question_count} Q</span></Link></li>
                ))}
              </ul>
            ) : <p className="small muted">No practice sets yet.</p>}
            <p style={{ marginTop: 8 }}><Link className="btn btn-sm" to={`/practice?exam=${exam}`}>Build a custom test ›</Link></p>
          </section>
          <section className="panel panel-pad">
            <h2>Marking scheme</h2>
            <MarkingSchemeTable scheme={e.marking_scheme} />
            <p className="small muted" style={{ marginTop: 6 }}>{e.marking_scheme_verified ? 'Verified.' : 'Not verified.'} {e.marking_scheme_note}</p>
          </section>
          {data.syllabus_versions.length > 0 && (
            <section className="panel panel-pad">
              <h2>Syllabus</h2>
              {data.syllabus_versions.map((v: any) => (
                <p key={v.label} className="small"><strong>{v.label}</strong> {v.is_verified ? <span className="badge badge-success">Verified</span> : <span className="badge badge-warn">Unverified</span>}<br />{v.notes}</p>
              ))}
            </section>
          )}
          <section className="panel panel-pad" hidden={import.meta.env.VITE_STATIC_DEMO === '1'}>
            <h2>Chapter PDFs</h2>
            <p className="small muted">Open any chapter to preview or download a PDF of its questions with answer key and solutions. PDFs are generated by PrepLedger from the questions shown here.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
