import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SubjectTabs, SyllabusBadge } from '../components/ExamNav';
import { Pagination } from '../components/Pagination';
import { QuestionCard } from '../components/QuestionCard';
import { Bars, StatGrid, YearChart } from '../components/Stats';
import { Empty, ErrorState, Loading, NotFound } from '../components/States';
import { api, qs } from '../lib/api';
import { useAuth } from '../lib/auth';
import { STATIC_DEMO } from '../lib/flags';
import { chapterPath, examPath, subjectPath } from '../lib/format';
import { useHead } from '../lib/head';
import type { Question } from '../lib/types';
import { useApi } from '../lib/useApi';

const FILTER_KEYS = ['type', 'year', 'topic', 'source', 'sort'] as const;

export function usePracticeState() {
  const { user } = useAuth();
  const [state, setState] = useState<Record<string, { response: any; is_correct: boolean }>>({});
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!user) return setState({});
    api.get<{ state: typeof state }>('/api/me/practice-state').then((r) => setState(r.state)).catch(() => setState({}));
  }, [user, nonce]);
  return { state, reload: () => setNonce((n) => n + 1) };
}

export function ChapterPage() {
  const { category = '', exam = '', subject = '', chapter = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const { user } = useAuth();
  const query = Object.fromEntries(FILTER_KEYS.map((k) => [k, sp.get(k) ?? undefined]));
  const page = Number(sp.get('page') ?? 1);
  const url = `/api/exams/${exam}/subjects/${subject}/chapters/${chapter}${qs({ ...query, page: page > 1 ? page : undefined })}`;
  const { data, error, loading, reload } = useApi<any>(url);
  const practice = usePracticeState();
  const [showStats, setShowStats] = useState(() => typeof window === 'undefined' || window.innerWidth > 760);
  const [sideOpen, setSideOpen] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  useHead(data ? `${data.chapter.name} – ${data.exam.name} ${data.subject.name} previous year questions` : null, {
    canonical: `${chapterPath(category, exam, subject, chapter)}${page > 1 ? `?page=${page}` : ''}`,
  });

  const setFilter = (k: string, v: string | undefined) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v);
    else n.delete(k);
    n.delete('page');
    setSp(n);
  };
  const clearAll = () => setSp(new URLSearchParams());

  if (error) return <ErrorState error={error} retry={reload} />;
  if (!data && loading) return <Loading lines={8} />;
  if (!data) return null;
  if (data.exam.category.slug !== category) return <NotFound />;
  const s = data.stats;
  const active = FILTER_KEYS.filter((k) => sp.get(k) && !(k === 'sort' && sp.get(k) === 'default'));
  const label = (k: string, v: string) =>
    k === 'type' ? data.facets.types.find((t: any) => t.type === v)?.label ?? v : k === 'topic' ? data.facets.topics.find((t: any) => t.slug === v)?.name ?? v : k === 'source' ? (v === 'pyq' ? 'Past-year only' : 'Samples only') : k === 'sort' ? `Sort: ${v.replace('_', ' ')}` : v;
  const pdfPath = `/print/chapter/${exam}/${subject}/${chapter}`;
  const units: Record<string, any[]> = {};
  for (const c of data.siblings) (units[c.unit_name ?? 'Chapters'] ??= []).push(c);

  const resetPractice = async () => {
    if (!confirm('Clear your saved practice answers for this chapter?')) return;
    try {
      const r = await api.del<{ deleted: number }>('/api/me/practice', { exam, subject, chapter });
      setResetMsg(`Practice reset (${r.deleted} saved answers cleared).`);
      practice.reload();
      reload();
    } catch (e: any) {
      setResetMsg(e.message);
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: data.exam.name, to: examPath(category, exam) }, { label: data.subject.name, to: subjectPath(category, exam, subject) }, { label: data.chapter.name }]} />
      <SubjectTabs category={category} exam={exam} subjects={data.subjects} active={subject} />
      <div className="layout-2col">
        <aside className={`sidebar collapsible ${sideOpen ? 'open' : ''}`} aria-label="Chapters">
          <button className="btn btn-sm no-print side-toggle" style={{ marginBottom: 8 }} onClick={() => setSideOpen((o) => !o)} aria-expanded={sideOpen}>
            {sideOpen ? 'Hide' : 'Show'} {data.subject.name} chapters
          </button>
          <div className="panel">
            {Object.entries(units).map(([u, list]) => (
              <div key={u}>
                <h3>{u}</h3>
                <ul className="side-list">
                  {list.map((c: any) => (
                    <li key={c.slug}>
                      <Link to={chapterPath(category, exam, subject, c.slug)} aria-current={c.slug === chapter ? 'page' : undefined}>
                        <span>{c.name}</span><span className="muted small">{c.question_count || '—'}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>
        <div>
          <div className="page-title">
            <h1>{data.chapter.name} <SyllabusBadge syllabus={data.chapter.syllabus} /></h1>
            <div className="row no-print">
              {!STATIC_DEMO && <a className="btn btn-sm" href={pdfPath} target="_blank" rel="noopener" data-testid="pdf-preview">PDF preview / print</a>}
              {!STATIC_DEMO && <a className="btn btn-sm" href={`/api/pdf${qs({ path: pdfPath, filename: `${exam}-${subject}-${chapter}.pdf` })}`} data-testid="pdf-download">Download PDF</a>}
              {s.total > 0 && <Link className="btn btn-sm btn-primary" to={`/test/custom${qs({ exam, chapters: `${subject}/${chapter}`, n: Math.min(20, s.total), seed: Date.now().toString(36) })}`}>Practice test</Link>}
            </div>
          </div>
          <div className="meta-line" style={{ marginBottom: 10 }}>
            <span>{data.exam.name} · {data.subject.name}{data.chapter.unit_name ? ` · ${data.chapter.unit_name}` : ''}</span>
            <span>{s.total} question{s.total === 1 ? '' : 's'}</span>
          </div>

          <section className="panel" style={{ marginBottom: 12 }} aria-labelledby="stats-h">
            <div className="panel-head">
              <h2 id="stats-h">Chapter statistics</h2>
              <button className="btn btn-sm" onClick={() => setShowStats((v) => !v)} aria-expanded={showStats}>{showStats ? 'Hide' : 'Show'}</button>
            </div>
            {showStats && (
              <div className="panel-pad stack" data-testid="chapter-stats">
                <StatGrid
                  items={[
                    { label: 'Questions', value: s.total },
                    { label: 'Past-year questions', value: s.pyqCount },
                    { label: 'Papers', value: s.paperCount, title: 'Distinct papers (incl. sample sets) containing these questions' },
                    { label: 'Years covered', value: s.yearsCovered.length ? `${s.yearsCovered[0]}–${s.yearsCovered[s.yearsCovered.length - 1]}` : '—' },
                    { label: 'Share of subject', value: s.weightage != null ? `${(s.weightage * 100).toFixed(1)}%` : '—', title: `${s.total} of ${s.subject_total} published questions in ${data.subject.name}` },
                  ]}
                />
                {s.total > 0 && <div><h3>Question types</h3><Bars label="Questions by type" rows={data.facets.types.map((t: any) => ({ label: t.label, value: t.count }))} /></div>}
                {s.byYear.length > 0 ? (
                  <div>
                    <h3>Questions per year</h3>
                    <YearChart data={s.byYear} />
                    {s.annualChange.length > 0 && <p className="small muted">Year-on-year change: {s.annualChange.map((c: any) => `${c.year}: ${c.delta > 0 ? '+' : ''}${c.delta}`).join(' · ')}</p>}
                  </div>
                ) : (
                  <p className="small muted">No year-wise trend: none of these questions is linked to a dated past paper.</p>
                )}
                <p className="small muted" data-testid="stats-disclosure">
                  Computed from {s.total} published question{s.total === 1 ? '' : 's'} in this database ({s.pyqCount} past-year, {s.sampleCount} original samples). Share of subject = chapter questions ÷ {s.subject_total} subject questions. These figures describe the imported dataset only and are not the official exam weightage. <Link to="/about">Methodology</Link>.
                </p>
              </div>
            )}
          </section>

          <section className="panel no-print" aria-label="Filters" style={{ marginBottom: 12 }}>
            <div className="filters">
              <label className="sr-only" htmlFor="f-type">Question type</label>
              <select id="f-type" value={sp.get('type') ?? ''} onChange={(e) => setFilter('type', e.target.value || undefined)}>
                <option value="">All types</option>
                {data.facets.types.map((t: any) => <option key={t.type} value={t.type}>{t.label} ({t.count})</option>)}
              </select>
              {data.facets.years.length > 0 && (
                <>
                  <label className="sr-only" htmlFor="f-year">Year</label>
                  <select id="f-year" value={sp.get('year') ?? ''} onChange={(e) => setFilter('year', e.target.value || undefined)}>
                    <option value="">All years</option>
                    {[...data.facets.years].reverse().map((y: any) => <option key={y.year} value={y.year}>{y.year} ({y.count})</option>)}
                  </select>
                </>
              )}
              {data.facets.topics.length > 0 && (
                <>
                  <label className="sr-only" htmlFor="f-topic">Topic</label>
                  <select id="f-topic" value={sp.get('topic') ?? ''} onChange={(e) => setFilter('topic', e.target.value || undefined)}>
                    <option value="">All topics</option>
                    {data.facets.topics.map((t: any) => <option key={t.slug} value={t.slug}>{t.name} ({t.count})</option>)}
                  </select>
                </>
              )}
              <label className="sr-only" htmlFor="f-source">Source</label>
              <select id="f-source" value={sp.get('source') ?? ''} onChange={(e) => setFilter('source', e.target.value || undefined)}>
                <option value="">All sources</option>
                <option value="pyq">Past-year only ({data.facets.sources.pyq})</option>
                <option value="sample">Samples only ({data.facets.sources.sample})</option>
              </select>
              <label className="sr-only" htmlFor="f-sort">Sort</label>
              <select id="f-sort" value={sp.get('sort') ?? 'default'} onChange={(e) => setFilter('sort', e.target.value === 'default' ? undefined : e.target.value)}>
                <option value="default">Default order</option>
                <option value="year_desc">Newest year first</option>
                <option value="year_asc">Oldest year first</option>
              </select>
              {user && <button className="btn btn-sm" onClick={resetPractice}>Reset practice</button>}
            </div>
            {active.length > 0 && (
              <div className="filters" style={{ paddingTop: 0 }}>
                <div className="chips" data-testid="active-filters">
                  {active.map((k) => (
                    <span className="chip" key={k}>{label(k, sp.get(k)!)}<button aria-label={`Remove filter ${k}`} onClick={() => setFilter(k, undefined)}>×</button></span>
                  ))}
                  <button className="btn-link small" onClick={clearAll}>Clear all</button>
                </div>
              </div>
            )}
          </section>
          {resetMsg && <p className="notice" role="status">{resetMsg}</p>}

          <p className="small muted" aria-live="polite" data-testid="result-count">
            {loading ? 'Updating…' : `${data.total} question${data.total === 1 ? '' : 's'}${active.length ? ' match the filters' : ''}${data.pages > 1 ? ` · page ${data.page} of ${data.pages}` : ''}`}
          </p>
          {data.total === 0 ? (
            s.total === 0 ? (
              <Empty title="No questions in this chapter yet">
                <p>Questions for {data.chapter.name} have not been imported. Try another chapter or check <Link to="/coverage">coverage</Link>.</p>
              </Empty>
            ) : (
              <Empty title="No questions match these filters"><button className="btn" onClick={clearAll}>Clear all filters</button></Empty>
            )
          ) : (
            data.questions.map((q: Question, i: number) => (
              <QuestionCard key={q.public_id} q={q} number={(data.page - 1) * data.page_size + i + 1} ctx={{ kind: 'chapter' }} practice={practice.state[q.public_id]} />
            ))
          )}
          <Pagination page={data.page} pages={data.pages} />
          <nav className="row-between no-print" style={{ marginTop: 16 }} aria-label="Adjacent chapters">
            {data.prev_chapter ? <Link to={chapterPath(category, exam, subject, data.prev_chapter.slug)}>‹ {data.prev_chapter.name}</Link> : <span />}
            {data.next_chapter ? <Link to={chapterPath(category, exam, subject, data.next_chapter.slug)}>{data.next_chapter.name} ›</Link> : <span />}
          </nav>
        </div>
      </div>
    </>
  );
}
