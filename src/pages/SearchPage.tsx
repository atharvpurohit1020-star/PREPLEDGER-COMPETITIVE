import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pagination } from '../components/Pagination';
import { QuestionCard } from '../components/QuestionCard';
import { Empty, ErrorState, Loading } from '../components/States';
import { qs } from '../lib/api';
import { chapterPath } from '../lib/format';
import { useHead } from '../lib/head';
import type { Question } from '../lib/types';
import { useApi } from '../lib/useApi';

const KEYS = ['q', 'exam', 'subject', 'chapter', 'type', 'year', 'source', 'sort', 'page'] as const;

export function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const params = Object.fromEntries(KEYS.map((k) => [k, sp.get(k) ?? undefined]));
  const { data, error, loading, reload } = useApi<any>(`/api/search${qs(params)}`);
  const [text, setText] = useState(sp.get('q') ?? '');
  useEffect(() => setText(sp.get('q') ?? ''), [sp]);
  useHead(sp.get('q') ? `Search: ${sp.get('q')}` : 'Search questions', { noindex: true });

  const set = (patch: Record<string, string | undefined>) => {
    const n = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k);
    if (!('page' in patch)) n.delete('page');
    if ('exam' in patch) { n.delete('subject'); n.delete('chapter'); }
    if ('subject' in patch) n.delete('chapter');
    setSp(n);
  };
  const filterKeys = ['exam', 'subject', 'chapter', 'type', 'year', 'source'] as const;
  const active = filterKeys.filter((k) => sp.get(k));
  const labelFor = (k: string, v: string) => {
    const f = data?.facets;
    const map: Record<string, any[]> = { exam: f?.exams, subject: f?.subjects, chapter: f?.chapters, type: f?.types };
    return map[k]?.find((x: any) => String(x.value) === v)?.label ?? (k === 'source' ? (v === 'pyq' ? 'Past-year only' : 'Samples only') : v);
  };
  const Facet = ({ title, k, items }: { title: string; k: string; items: any[] }) =>
    items?.length ? (
      <div className="facet">
        <h4>{title}</h4>
        <ul>
          {items.map((it: any) => {
            const on = sp.get(k) === String(it.value);
            return (
              <li key={it.value}>
                <button aria-pressed={on} onClick={() => set({ [k]: on ? undefined : String(it.value) })}>
                  <span>{it.label ?? (k === 'source' ? (it.value === 'pyq' ? 'Past-year' : 'Sample') : it.value)}</span><span className="muted">{it.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  return (
    <>
      <div className="page-title"><h1>Search</h1></div>
      <form role="search" className="row" style={{ marginBottom: 12 }} onSubmit={(e) => { e.preventDefault(); set({ q: text.trim() || undefined }); }}>
        <label htmlFor="search-q" className="sr-only">Search text</label>
        <input id="search-q" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Words from a question, a chapter name, a question ID…" style={{ flex: 1, minWidth: 200 }} />
        <button className="btn btn-primary">Search</button>
      </form>
      <div className="layout-2col">
        <aside className="panel panel-pad" aria-label="Filters" data-testid="facets">
          {data ? (
            <>
              <Facet title="Exam" k="exam" items={data.facets.exams} />
              <Facet title="Subject" k="subject" items={data.facets.subjects} />
              <Facet title="Chapter" k="chapter" items={data.facets.chapters} />
              <Facet title="Question type" k="type" items={data.facets.types} />
              <Facet title="Year" k="year" items={data.facets.years} />
              <Facet title="Source" k="source" items={data.facets.sources} />
              {!sp.get('exam') && <p className="small muted" style={{ marginTop: 8 }}>Choose an exam to filter by subject and chapter.</p>}
            </>
          ) : <div className="skeleton" />}
        </aside>
        <div>
          <div className="row-between" style={{ marginBottom: 8 }}>
            <span className="small muted" aria-live="polite" data-testid="result-count">{data ? `${data.total} result${data.total === 1 ? '' : 's'}${data.pages > 1 ? ` · page ${data.page} of ${data.pages}` : ''}` : loading ? 'Searching…' : ''}</span>
            <label className="small">Sort{' '}
              <select value={sp.get('sort') ?? 'relevance'} onChange={(e) => set({ sort: e.target.value === 'relevance' ? undefined : e.target.value })}>
                <option value="relevance">Relevance</option>
                <option value="year_desc">Newest exam year</option>
                <option value="year_asc">Oldest exam year</option>
                <option value="newest">Recently added</option>
              </select>
            </label>
          </div>
          {active.length > 0 && (
            <div className="chips" style={{ marginBottom: 10 }} data-testid="active-filters">
              {active.map((k) => <span className="chip" key={k}>{labelFor(k, sp.get(k)!)}<button aria-label={`Remove ${k} filter`} onClick={() => set({ [k]: undefined })}>×</button></span>)}
              <button className="btn-link small" onClick={() => setSp(sp.get('q') ? { q: sp.get('q')! } : {})}>Clear all</button>
            </div>
          )}
          {error && <ErrorState error={error} retry={reload} />}
          {loading && !data && <Loading />}
          {data?.chapter_hits?.length > 0 && (
            <section className="panel panel-pad" style={{ marginBottom: 12 }}>
              <h2>Matching chapters</h2>
              <ul className="chapter-list">
                {data.chapter_hits.map((c: any) => (
                  <li key={`${c.exam}-${c.subject}-${c.slug}`}><Link to={chapterPath(c.category, c.exam, c.subject, c.slug)}>{c.name}</Link><span className="count">{c.exam_name} · {c.question_count || '—'}</span></li>
                ))}
              </ul>
            </section>
          )}
          {data && data.total === 0 && (
            <Empty title="No questions found">
              <p>Try different words{active.length ? ', or remove some filters' : ''}.</p>
              {active.length > 0 && <button className="btn" onClick={() => setSp(sp.get('q') ? { q: sp.get('q')! } : {})}>Clear filters</button>}
            </Empty>
          )}
          {data?.results.map((q: Question, i: number) => <QuestionCard key={q.public_id} q={q} number={(data.page - 1) * data.page_size + i + 1} />)}
          {data && <Pagination page={data.page} pages={data.pages} />}
        </div>
      </div>
    </>
  );
}
