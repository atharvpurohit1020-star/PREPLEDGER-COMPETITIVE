import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toPlainText } from '../../shared/content';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { QuestionCard } from '../components/QuestionCard';
import { ErrorState, Loading } from '../components/States';
import { api, qs } from '../lib/api';
import { useAuth } from '../lib/auth';
import { chapterPath, examPath, paperPath, questionPath, subjectPath } from '../lib/format';
import { useHead } from '../lib/head';
import type { Question } from '../lib/types';
import { useApi } from '../lib/useApi';
import { usePracticeState } from './ChapterPage';

export function QuestionPage() {
  const { publicId = '' } = useParams();
  const [sp] = useSearchParams();
  const ctx = sp.get('ctx') === 'paper' ? 'paper' : undefined;
  const paper = sp.get('paper') ?? undefined;
  const { data, error, loading, reload } = useApi<{ question: Question; context: any; open_reports: number }>(`/api/questions/${publicId}${qs({ ctx, paper })}`);
  const { user } = useAuth();
  const practice = usePracticeState();
  const q = data?.question;
  useHead(q ? `${toPlainText(q.body).slice(0, 70)}… – ${q.exam.name} ${q.chapter.name}` : null, { canonical: `/question/${publicId}`, description: q ? toPlainText(q.body).slice(0, 155) : undefined });
  useEffect(() => {
    if (user && q) api.post(`/api/me/recent/${q.public_id}`).catch(() => undefined);
  }, [user, q?.public_id]);
  if (loading && !data) return <Loading lines={8} />;
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data || !q) return null;
  const c = data.context;
  const cat = q.exam.category;
  const navCtx = c.kind === 'paper' ? { kind: 'paper' as const, paper: c.paper.public_id } : undefined;
  return (
    <>
      <Breadcrumbs
        items={[
          { label: q.exam.name, to: examPath(cat, q.exam.slug) },
          { label: q.subject.name, to: subjectPath(cat, q.exam.slug, q.subject.slug) },
          ...(c.kind === 'paper'
            ? [{ label: c.paper.title, to: paperPath(cat, q.exam.slug, c.paper.slug, c.paper.public_id) }]
            : [{ label: q.chapter.name, to: chapterPath(cat, q.exam.slug, q.subject.slug, q.chapter.slug) }]),
          { label: c.kind === 'paper' ? `Question ${c.number}` : `Question ${c.position} of ${c.total}` },
        ]}
      />
      <div className="row-between no-print" style={{ marginBottom: 10 }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 0 }} role="tablist" aria-label="Context">
          <Link role="tab" to={questionPath(q.public_id)} aria-selected={c.kind === 'chapter'}>Chapter: {q.chapter.name}</Link>
          {q.papers.map((p) => (
            <Link role="tab" key={p.public_id} to={questionPath(q.public_id, { kind: 'paper', paper: p.public_id })} aria-selected={c.kind === 'paper' && c.paper.public_id === p.public_id}>
              {p.title} · Q{p.question_number}
            </Link>
          ))}
        </div>
        <span className="small muted">{c.kind === 'paper' ? `Q${c.number} · ${c.position} of ${c.total} in paper` : `${c.position} of ${c.total} in chapter`}</span>
      </div>
      {data.open_reports > 0 && <p className="notice notice-warn small">{data.open_reports} open report(s) about this question are being reviewed.</p>}
      <QuestionCard key={`${q.public_id}-${c.kind}`} q={q} number={c.kind === 'paper' ? c.number : c.position} ctx={navCtx ?? { kind: 'chapter' }} practice={practice.state[q.public_id]} showDetailLink={false} />
      <nav className="row-between no-print" style={{ marginTop: 12 }} aria-label="Question navigation">
        {c.prev ? <Link className="btn" to={questionPath(c.prev, navCtx)} rel="prev" data-testid="prev-question">‹ Previous question</Link> : <span className="btn" aria-disabled="true" style={{ opacity: .5 }}>‹ Previous question</span>}
        <Link to={c.kind === 'paper' ? paperPath(cat, q.exam.slug, c.paper.slug, c.paper.public_id) + `#q-${q.public_id}` : chapterPath(cat, q.exam.slug, q.subject.slug, q.chapter.slug)}>Back to {c.kind === 'paper' ? 'paper' : 'chapter'}</Link>
        {c.next ? <Link className="btn" to={questionPath(c.next, navCtx)} rel="next" data-testid="next-question">Next question ›</Link> : <span className="btn" aria-disabled="true" style={{ opacity: .5 }}>Next question ›</span>}
      </nav>
      <section className="panel panel-pad small" style={{ marginTop: 14 }} aria-labelledby="prov-h">
        <h2 id="prov-h">About this question</h2>
        <table className="data">
          <tbody>
            <tr><th>Exam / subject / chapter</th><td>{q.exam.name} · {q.subject.name} · {q.chapter.name}{q.also_chapters.length ? ` (also: ${q.also_chapters.map((x) => x.name).join(', ')})` : ''}</td></tr>
            {q.topics.length > 0 && <tr><th>Topics</th><td>{q.topics.map((t) => t.name).join(', ')}</td></tr>}
            <tr><th>Type</th><td>{q.type_label}{q.difficulty ? ` · ${q.difficulty}` : ''}</td></tr>
            <tr><th>Past-year question?</th><td>{q.is_pyq ? 'Yes' : 'No — original sample written for PrepLedger'}</td></tr>
            <tr><th>Source</th><td>{q.source.title} ({q.source.type.replace('_', ' ')})<br /><span className="muted">{q.source.license}</span></td></tr>
            <tr><th>Verification</th><td>{q.verification_status.replace('_', ' ')}</td></tr>
            <tr><th>Question ID</th><td><code>{q.public_id}</code></td></tr>
          </tbody>
        </table>
      </section>
    </>
  );
}
