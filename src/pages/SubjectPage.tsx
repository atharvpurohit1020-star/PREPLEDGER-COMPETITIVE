import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ModeTabs, SubjectTabs } from '../components/ExamNav';
import { ErrorState, Loading, NotFound } from '../components/States';
import { examPath } from '../lib/format';
import { useHead } from '../lib/head';
import { useApi } from '../lib/useApi';
import { ChapterUnits } from './ExamPage';

export function SubjectPage() {
  const { category = '', exam = '', subject = '' } = useParams();
  const { data, error, loading, reload } = useApi<any>(`/api/exams/${exam}/subjects/${subject}`);
  useHead(data ? `${data.exam.name} ${data.subject.name} chapter-wise questions` : null);
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data) return null;
  if (data.exam.category.slug !== category) return <NotFound />;
  return (
    <>
      <Breadcrumbs items={[{ label: data.exam.name, to: examPath(category, exam) }, { label: data.subject.name }]} />
      <div className="page-title">
        <h1>{data.exam.name} · {data.subject.name}</h1>
        <span className="muted small">{data.subject.question_count} questions</span>
      </div>
      <ModeTabs category={category} exam={exam} active="chapter" />
      <SubjectTabs category={category} exam={exam} subjects={data.subjects} active={subject} />
      <section className="panel panel-pad">
        <ChapterUnits units={data.units} category={category} exam={exam} subject={subject} showWeight />
        <p className="small muted" style={{ marginTop: 8 }}>
          Percentages are each chapter’s share of the published questions in this subject (denominator: {data.subject.question_count}). They describe the imported dataset only, not the real exam weightage. See <Link to="/about">methodology</Link>.
        </p>
      </section>
    </>
  );
}
