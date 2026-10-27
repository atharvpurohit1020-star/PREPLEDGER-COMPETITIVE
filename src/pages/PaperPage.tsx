import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { formatAnswer } from '../../shared/scoring';
import { QUESTION_TYPE_LABELS, type MarkingScheme, type QuestionType } from '../../shared/types';
import { KeyBadges } from '../components/AnswerPanel';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ModeTabs } from '../components/ExamNav';
import { QuestionCard } from '../components/QuestionCard';
import { Empty, ErrorState, Loading, NotFound } from '../components/States';
import { qs } from '../lib/api';
import { examPath, fmtDate, papersPath, paperPath } from '../lib/format';
import { useHead } from '../lib/head';
import { STATIC_DEMO } from '../lib/flags';
import { useApi } from '../lib/useApi';
import { usePracticeState } from './ChapterPage';

export function MarkingSchemeTable({ scheme }: { scheme: MarkingScheme | null }) {
  const rows = Object.entries(scheme ?? {}).filter(([k, v]) => k !== 'note' && typeof v === 'object') as [QuestionType, any][];
  if (!rows.length) return <p className="small muted">No marking scheme recorded.</p>;
  return (
    <table className="data small">
      <thead><tr><th>Type</th><th className="num">Correct</th><th className="num">Wrong</th></tr></thead>
      <tbody>
        {rows.map(([t, r]) => (
          <tr key={t}><td>{QUESTION_TYPE_LABELS[t] ?? t}{r.partial === 'per_option' ? ' (partial +1/option)' : ''}</td><td className="num">+{r.correct}</td><td className="num">{r.wrong}</td></tr>
        ))}
      </tbody>
      {scheme?.note && <caption className="small muted" style={{ captionSide: 'bottom', textAlign: 'left' }}>{scheme.note}</caption>}
    </table>
  );
}

export function PaperPage() {
  const { category = '', exam = '', paperId = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const { data, error, loading, reload } = useApi<any>(`/api/papers/${paperId}`);
  const practice = usePracticeState();
  const [keyOpen, setKeyOpen] = useState(false);
  const section = sp.get('section');
  useHead(data ? `${data.paper.title} – questions with solutions` : null, { canonical: data ? paperPath(category, exam, data.paper.slug, paperId) : undefined });
  const items = useMemo(() => (data?.items ?? []).filter((i: any) => !section || i.section === section), [data, section]);
  if (loading) return <Loading lines={8} />;
  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data) return null;
  if (data.exam.slug !== exam || data.exam.category !== category) return <NotFound />;
  const p = data.paper;
  const sections: { key: string; name: string }[] = p.sections?.length ? p.sections : [...new Set(data.items.map((i: any) => i.section).filter(Boolean))].map((k: any) => ({ key: k, name: k }));
  const pdfPath = `/print/paper/${paperId}`;
  return (
    <>
      <Breadcrumbs items={[{ label: data.exam.name, to: examPath(category, exam) }, { label: 'Papers', to: papersPath(category, exam) }, { label: p.title }]} />
      <ModeTabs category={category} exam={exam} active="paper" />
      <div className="page-title">
        <h1>{p.title}</h1>
        {data.items.length > 0 && (
          <div className="row no-print">
            <Link className="btn btn-sm btn-primary" to={`/test/paper/${paperId}`}>Take as timed test</Link>
            {!STATIC_DEMO && <a className="btn btn-sm" href={pdfPath} target="_blank" rel="noopener">PDF preview / print</a>}
            {!STATIC_DEMO && <a className="btn btn-sm" href={`/api/pdf${qs({ path: pdfPath, filename: `${p.slug}.pdf` })}`}>Download PDF</a>}
          </div>
        )}
      </div>
      <div className="meta-line" style={{ marginBottom: 10 }} data-testid="paper-meta">
        {p.kind === 'sample' ? <span className="badge badge-warn">Original sample set · not a past paper</span> : <span className="badge badge-primary">Past paper</span>}
        {p.year && <span>Year {p.year}</span>}
        {p.session && <span>Session: {p.session}</span>}
        {p.exam_date && <span>Date: {fmtDate(p.exam_date)}</span>}
        {p.shift && <span>Shift: {p.shift}</span>}
        {p.duration_minutes && <span>Duration: {p.duration_minutes} min</span>}
        {p.total_marks && <span>Total marks: {p.total_marks}</span>}
        <span>{data.items.length} questions available</span>
        <span>Metadata: {p.verification_status}</span>
      </div>
      {p.notes && <p className="notice small">{p.notes}</p>}
      {data.items.length === 0 ? (
        <Empty title="Questions not available">
          <p>This paper is listed for reference, but its questions have not been imported from a licensed source. Nothing is shown rather than reconstructing the paper.</p>
          <p><Link to={papersPath(category, exam)}>‹ Back to all papers</Link></p>
        </Empty>
      ) : (
        <div className="layout-2col aside-right aside-280">
          <div>
            {sections.length > 1 && (
              <nav className="tabs" aria-label="Sections">
                <button aria-selected={!section} onClick={() => setSp({})}>All sections</button>
                {sections.map((s) => (
                  <button key={s.key} aria-selected={section === s.key} onClick={() => setSp({ section: s.key })}>{s.name}</button>
                ))}
              </nav>
            )}
            {items.map((i: any) => (
              <QuestionCard key={i.question.public_id} q={i.question} number={i.number} ctx={{ kind: 'paper', paper: paperId }} practice={practice.state[i.question.public_id]} />
            ))}
          </div>
          <aside className="stack">
            <section className="panel panel-pad">
              <h2>Marking scheme</h2>
              <MarkingSchemeTable scheme={p.marking_scheme} />
              {p.marking_scheme_note && <p className="small muted">{p.marking_scheme_note}</p>}
            </section>
            <section className="panel panel-pad">
              <div className="row-between"><h2>Answer key</h2><button className="btn btn-sm" onClick={() => setKeyOpen((o) => !o)} aria-expanded={keyOpen} data-testid="answer-key-toggle">{keyOpen ? 'Hide' : 'Show'}</button></div>
              {keyOpen && (
                <table className="data small" data-testid="answer-key">
                  <thead><tr><th>Q</th><th>Answer</th><th>Key</th></tr></thead>
                  <tbody>
                    {data.items.map((i: any) => (
                      <tr key={i.number}>
                        <td><a href={`#q-${i.question.public_id}`}>{i.number}</a></td>
                        <td>{i.question.answer ? (i.question.answer.status === 'dropped' ? 'Dropped' : formatAnswer(i.question.answer.value)) : '—'}</td>
                        <td>{i.question.answer && <KeyBadges k={i.question.answer} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section className="panel panel-pad small">
              <h2>Source</h2>
              <p>{p.source.title}<br /><span className="muted">{p.source.license}</span></p>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
