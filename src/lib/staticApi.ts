/**
 * In-browser implementation of the public read-only API, used only by the static preview build
 * (VITE_STATIC_DEMO=1). It mirrors the response shapes of server/routes/public.ts and tests.ts
 * from a bundled snapshot (data/demo/demo.json). Accounts, admin, reports and PDF need the server.
 */
import data from '../../data/demo/demo.json';
import { ruleFor, scoreResponse } from '../../shared/scoring';
import { computeChapterStats } from '../../shared/stats';
import { QUESTION_TYPE_LABELS, type QuestionType } from '../../shared/types';
import { ApiError } from './api';

const D = data as any;
const PAGE = 20;
const exams: any[] = D.exams;
const subjects: any[] = D.subjects;
const chapters: any[] = D.chapters;
const papers: any[] = D.papers;
const links: any[] = D.links;
const questions: any[] = D.questions;
const qById = new Map(questions.map((q) => [q.id, q]));
const qByPid = new Map(questions.map((q) => [q.public_id, q]));
const examBySlug = (s: string) => exams.find((e) => e.slug === s) ?? fail(404, `Exam "${s}" not found`);
function fail(status: number, msg: string): never {
  throw new ApiError(status, msg);
}
const clean = (q: any, withAnswers = true) => {
  const { _chapter_id, _subject_id, _exam_id, _search, _created, _tagged, ...rest } = q;
  return withAnswers ? rest : { ...rest, answer: undefined, solutions: undefined, answer_history: undefined };
};
const summary = (e: any) => ({
  slug: e.slug, name: e.name, short_name: e.short_name, full_name: e.full_name, conducting_body: e.conducting_body, region: e.region,
  description: e.description, on_reference: e.on_reference, category: { slug: e.category_slug, name: e.category_name },
  marking_scheme: e.marking_scheme, marking_scheme_note: e.marking_scheme_note, marking_scheme_verified: e.marking_scheme_verified,
});
const paperQuestionCount = (p: any) => links.filter((l) => l.paper_id === p.id).length;
const chapterStat = (c: any) => {
  const qs = questions.filter((q) => q._chapter_id === c.id);
  const ps = new Set(links.filter((l) => qs.some((q) => q.id === l.question_id)).map((l) => l.paper_id));
  const years = papers.filter((p) => ps.has(p.id) && p.kind === 'past_paper' && p.year).map((p) => p.year);
  return {
    slug: c.slug, name: c.name, unit_name: c.unit_name, question_count: qs.length, pyq_count: qs.filter((q) => q.is_pyq).length,
    paper_count: ps.size, first_year: years.length ? Math.min(...years) : null, last_year: years.length ? Math.max(...years) : null, syllabus: c.syllabus,
  };
};
const units = (list: any[]) => {
  const out: { name: string; chapters: any[] }[] = [];
  for (const c of list) {
    const n = c.unit_name ?? 'Chapters';
    let u = out.find((x) => x.name === n);
    if (!u) out.push((u = { name: n, chapters: [] }));
    u.chapters.push(c);
  }
  return out;
};
const subjectOf = (e: any, slug: string) => subjects.find((s) => s.exam_id === e.id && s.slug === slug) ?? fail(404, `Subject "${slug}" not found`);
const subjectList = (e: any) => subjects.filter((s) => s.exam_id === e.id).map(({ slug, name }) => ({ slug, name }));
const int = (v: string | null) => (v == null || v === '' ? undefined : Number(v));

function examsList() {
  return {
    categories: D.categories.map((c: any) => ({
      slug: c.slug, name: c.name,
      exams: exams.filter((e) => e.category_slug === c.slug).map((e) => ({
        slug: e.slug, name: e.name, short_name: e.short_name, region: e.region, on_reference: e.on_reference,
        question_count: questions.filter((q) => q._exam_id === e.id).length,
        pyq_count: questions.filter((q) => q._exam_id === e.id && q.is_pyq).length,
        past_paper_count: papers.filter((p) => p.exam_id === e.id && p.kind === 'past_paper').length,
        sample_paper_count: papers.filter((p) => p.exam_id === e.id && p.kind === 'sample').length,
      })),
    })),
  };
}

function examDetail(slug: string) {
  const e = examBySlug(slug);
  const subs = subjects.filter((s) => s.exam_id === e.id).map((s) => {
    const ch = chapters.filter((c) => c.subject_id === s.id).map(chapterStat);
    return { slug: s.slug, name: s.name, question_count: ch.reduce((a, c) => a + c.question_count, 0), chapter_count: ch.length, chapters_with_questions: ch.filter((c) => c.question_count).length, units: units(ch) };
  });
  const ps = papers.filter((p) => p.exam_id === e.id).map((p) => ({ ...p, question_count: paperQuestionCount(p) }));
  return {
    exam: summary(e), subjects: subs, syllabus_versions: D.syllabus.filter((v: any) => v.exam_id === e.id),
    papers: {
      years: [...new Set(ps.filter((p) => p.kind === 'past_paper' && p.year).map((p) => p.year))].sort((a: any, b: any) => b - a),
      past_paper_count: ps.filter((p) => p.kind === 'past_paper').length,
      past_papers_with_questions: ps.filter((p) => p.kind === 'past_paper' && p.question_count > 0).length,
      samples: ps.filter((p) => p.kind === 'sample'),
    },
    totals: { questions: subs.reduce((a, s) => a + s.question_count, 0), pyq: questions.filter((q) => q._exam_id === e.id && q.is_pyq).length },
  };
}

function subjectDetail(exam: string, subject: string) {
  const e = examBySlug(exam);
  const s = subjectOf(e, subject);
  const ch = chapters.filter((c) => c.subject_id === s.id).map(chapterStat);
  const total = ch.reduce((a, c) => a + c.question_count, 0);
  return { exam: summary(e), subject: { slug: s.slug, name: s.name, question_count: total }, subjects: subjectList(e), units: units(ch.map((c) => ({ ...c, weightage: total ? c.question_count / total : null }))) };
}

const paperLinksOf = (qid: number) => links.filter((l) => l.question_id === qid).map((l) => papers.find((p) => p.id === l.paper_id)).filter(Boolean);

function chapterDetail(exam: string, subject: string, chapter: string, sp: URLSearchParams) {
  const e = examBySlug(exam);
  const s = subjectOf(e, subject);
  const c = chapters.find((x) => x.subject_id === s.id && x.slug === chapter) ?? fail(404, `Chapter "${chapter}" not found`);
  const type = sp.get('type') ?? undefined;
  if (type && !(type in QUESTION_TYPE_LABELS)) fail(400, 'Invalid query: type');
  const year = int(sp.get('year'));
  const topic = sp.get('topic') ?? undefined;
  const source = sp.get('source') ?? undefined;
  const sort = sp.get('sort') ?? 'default';
  const page = int(sp.get('page')) ?? 1;
  const recs = questions.filter((q) => q._chapter_id === c.id || q._tagged.includes(c.id));
  const subjectTotal = questions.filter((q) => q._subject_id === s.id).length;
  const stats = computeChapterStats(recs.map((q) => ({ questionId: q.id, type: q.type, isPyq: q.is_pyq, papers: paperLinksOf(q.id).map((p: any) => ({ paperId: p.id, year: p.year, kind: p.kind })) })), subjectTotal);
  const latest = (q: any) => Math.max(-1, ...paperLinksOf(q.id).filter((p: any) => p.kind === 'past_paper' && p.year).map((p: any) => p.year));
  let filtered = recs.filter((q) =>
    (!type || q.type === type) && (!year || paperLinksOf(q.id).some((p: any) => p.year === year && p.kind === 'past_paper')) &&
    (!topic || q.topics.some((t: any) => t.slug === topic)) && (!source || (source === 'pyq' ? q.is_pyq : !q.is_pyq)));
  if (sort === 'year_desc') filtered = [...filtered].sort((a, b) => latest(b) - latest(a) || a.id - b.id);
  if (sort === 'year_asc') filtered = [...filtered].sort((a, b) => latest(a) - latest(b) || a.id - b.id);
  const size = sp.get('all') ? 500 : PAGE;
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  if (page > pages && filtered.length) fail(404, `Page ${page} does not exist (last page is ${pages})`);
  const siblings = chapters.filter((x) => x.subject_id === s.id).map((x) => ({ slug: x.slug, name: x.name, unit_name: x.unit_name, question_count: chapterStat(x).question_count }));
  const idx = siblings.findIndex((x) => x.slug === c.slug);
  const topics = D.topics.filter((t: any) => t.chapter_id === c.id).map((t: any) => ({ slug: t.slug, name: t.name, count: recs.filter((q) => q.topics.some((x: any) => x.slug === t.slug)).length }));
  return {
    exam: summary(e), subject: { slug: s.slug, name: s.name }, subjects: subjectList(e),
    chapter: { slug: c.slug, name: c.name, unit_name: c.unit_name, syllabus: c.syllabus ?? [] },
    siblings, prev_chapter: idx > 0 ? siblings[idx - 1] : null, next_chapter: idx < siblings.length - 1 ? siblings[idx + 1] : null,
    stats: { ...stats, subject_total: subjectTotal, type_labels: QUESTION_TYPE_LABELS },
    facets: {
      types: Object.entries(stats.byType).map(([t, count]) => ({ type: t, label: QUESTION_TYPE_LABELS[t as QuestionType], count })),
      years: stats.byYear, topics, sources: { pyq: stats.pyqCount, sample: stats.sampleCount },
    },
    filters: { type, year, topic, source, sort, page }, total: filtered.length, page, pages, page_size: size,
    questions: filtered.slice((page - 1) * size, page * size).map((q) => clean(q)),
  };
}

function paperList(exam: string) {
  const e = examBySlug(exam);
  const rows = papers.filter((p) => p.exam_id === e.id).map((p) => ({ ...p, question_count: paperQuestionCount(p) }));
  const years: any[] = [];
  for (const p of rows.filter((r) => r.kind === 'past_paper')) {
    let g = years.find((x) => x.year === p.year);
    if (!g) years.push((g = { year: p.year, label: String(p.year), papers: [] }));
    g.papers.push(p);
  }
  return { exam: summary(e), years, samples: rows.filter((r) => r.kind === 'sample') };
}

function paperDetail(pid: string, withAnswers: boolean) {
  const p = papers.find((x) => x.public_id === pid) ?? fail(404, 'Paper not found');
  const e = exams.find((x) => x.id === p.exam_id);
  const items = links.filter((l) => l.paper_id === p.id).map((l) => ({ number: l.question_number, section: l.section_key, marks: l.marks, negative_marks: l.negative_marks, question: clean(qById.get(l.question_id), withAnswers) }));
  return {
    paper: { ...p, id: undefined, exam_id: undefined, marking_scheme: p.marking_scheme ?? e.marking_scheme, marking_scheme_note: p.marking_scheme ? null : e.marking_scheme_note, source: { title: p.source_title, type: p.source_type, license: p.license } },
    exam: { slug: e.slug, name: e.name, category: e.category_slug }, items,
  };
}

function questionDetail(pid: string, sp: URLSearchParams) {
  const q = qByPid.get(pid) ?? fail(404, 'Question not found');
  let context: any = null;
  const paperRef = sp.get('paper') ?? (sp.get('ctx') === 'paper' ? q.papers[0]?.public_id : undefined);
  if (sp.get('ctx') === 'paper' && paperRef) {
    const p = papers.find((x) => x.public_id === paperRef);
    if (p) {
      const list = links.filter((l) => l.paper_id === p.id).map((l) => ({ pid: qById.get(l.question_id).public_id, n: l.question_number }));
      const i = list.findIndex((x) => x.pid === pid);
      if (i >= 0) context = { kind: 'paper', paper: { public_id: p.public_id, slug: p.slug, title: p.title }, position: i + 1, total: list.length, number: list[i].n, prev: list[i - 1]?.pid ?? null, next: list[i + 1]?.pid ?? null };
    }
  }
  if (!context) {
    const list = questions.filter((x) => x._chapter_id === q._chapter_id).map((x) => x.public_id);
    const i = list.indexOf(pid);
    context = { kind: 'chapter', position: i + 1, total: list.length, prev: list[i - 1] ?? null, next: list[i + 1] ?? null };
  }
  return { question: clean(q), context, open_reports: 0 };
}

function search(sp: URLSearchParams) {
  const text = (sp.get('q') ?? '').trim().toLowerCase();
  const f: Record<string, any> = { exam: sp.get('exam'), subject: sp.get('subject'), chapter: sp.get('chapter'), type: sp.get('type'), year: int(sp.get('year')), source: sp.get('source') };
  if (f.type && !(f.type in QUESTION_TYPE_LABELS)) fail(400, 'Invalid query: type');
  const sort = sp.get('sort') ?? 'relevance';
  const page = int(sp.get('page')) ?? 1;
  const words = text.split(/\s+/).filter(Boolean);
  const hay = (q: any) => `${q._search} ${q.chapter.name} ${q.subject.name} ${q.exam.name} ${q.public_id}`.toLowerCase();
  const score = (q: any) => words.reduce((a, w) => a + (hay(q).split(w).length - 1), 0);
  const tests: Record<string, (q: any) => boolean> = {
    q: (q) => !words.length || words.every((w) => hay(q).includes(w)),
    exam: (q) => !f.exam || q.exam.slug === f.exam,
    subject: (q) => !f.subject || q.subject.slug === f.subject,
    chapter: (q) => !f.chapter || q.chapter.slug === f.chapter,
    type: (q) => !f.type || q.type === f.type,
    source: (q) => !f.source || (f.source === 'pyq' ? q.is_pyq : !q.is_pyq),
    year: (q) => !f.year || paperLinksOf(q.id).some((p: any) => p.kind === 'past_paper' && p.year === f.year),
  };
  const match = (except?: string) => questions.filter((q) => Object.entries(tests).every(([k, t]) => k === except || t(q)));
  const examOrder = (q: any) => exams.findIndex((e) => e.id === q._exam_id);
  const maxYear = (q: any) => Math.max(-1, ...paperLinksOf(q.id).filter((p: any) => p.kind === 'past_paper').map((p: any) => p.year ?? -1));
  let rows = match();
  rows = [...rows].sort(
    sort === 'year_desc' ? (a, b) => maxYear(b) - maxYear(a) || a.id - b.id
      : sort === 'year_asc' ? (a, b) => maxYear(a) - maxYear(b) || a.id - b.id
      : sort === 'newest' ? (a, b) => b.id - a.id
      : words.length ? (a, b) => score(b) - score(a) || a.id - b.id
      : (a, b) => examOrder(a) - examOrder(b) || a._subject_id - b._subject_id || a._chapter_id - b._chapter_id || a.id - b.id,
  );
  const count = (list: any[], key: (q: any) => any, label?: (q: any) => string) => {
    const m = new Map<any, any>();
    for (const q of list) {
      const k = key(q);
      if (!m.has(k)) m.set(k, { value: k, ...(label ? { label: label(q) } : {}), count: 0 });
      m.get(k).count++;
    }
    return [...m.values()];
  };
  const yearsFacet = () => {
    const m = new Map<number, number>();
    for (const q of match('year')) for (const y of new Set(paperLinksOf(q.id).filter((p: any) => p.kind === 'past_paper' && p.year).map((p: any) => p.year))) m.set(y as number, (m.get(y as number) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[0] - a[0]).map(([value, c]) => ({ value, count: c }));
  };
  const chapterHits = words.length
    ? chapters.filter((c) => c.name.toLowerCase().includes(text)).map((c) => {
        const s = subjects.find((x) => x.id === c.subject_id);
        const e = exams.find((x) => x.id === s.exam_id);
        return { exam: e.slug, exam_name: e.name, category: e.category_slug, subject: s.slug, subject_name: s.name, slug: c.slug, name: c.name, question_count: chapterStat(c).question_count, _e: e };
      }).filter((h) => !f.exam || h.exam === f.exam).sort((a, b) => b.question_count - a.question_count).slice(0, 12)
    : [];
  return {
    filters: { q: text, ...f, sort, page }, total: rows.length, page, pages: Math.max(1, Math.ceil(rows.length / PAGE)), page_size: PAGE,
    results: rows.slice((page - 1) * PAGE, page * PAGE).map((q) => clean(q)),
    chapter_hits: chapterHits,
    facets: {
      exams: count(match('exam'), (q) => q.exam.slug, (q) => q.exam.name),
      subjects: f.exam ? count(match('subject'), (q) => q.subject.slug, (q) => q.subject.name) : [],
      chapters: f.exam && f.subject ? count(match('chapter'), (q) => q.chapter.slug, (q) => q.chapter.name) : [],
      types: count(match('type'), (q) => q.type).map((t) => ({ ...t, label: QUESTION_TYPE_LABELS[t.value as QuestionType] })),
      years: yearsFacet(),
      sources: count(match('source'), (q) => (q.is_pyq ? 'pyq' : 'sample')),
    },
  };
}

function coverage() {
  const ex = exams.map((e) => {
    const ch = chapters.filter((c) => subjects.some((s) => s.id === c.subject_id && s.exam_id === e.id));
    const qs = questions.filter((q) => q._exam_id === e.id);
    const ps = papers.filter((p) => p.exam_id === e.id);
    return {
      slug: e.slug, name: e.name, on_reference: e.on_reference, chapters: ch.length, chapters_with_questions: ch.filter((c) => chapterStat(c).question_count).length,
      published: qs.length, pyq: qs.filter((q) => q.is_pyq).length, verified: qs.filter((q) => q.verification_status === 'verified').length, unpublished: 0,
      past_papers: ps.filter((p) => p.kind === 'past_paper').length, past_papers_full: ps.filter((p) => p.kind === 'past_paper' && p.availability === 'full').length,
      past_papers_partial: ps.filter((p) => p.kind === 'past_paper' && p.availability === 'partial').length, sample_papers: ps.filter((p) => p.kind === 'sample').length,
    };
  });
  const subs = subjects.map((s) => {
    const e = exams.find((x) => x.id === s.exam_id);
    const ch = chapters.filter((c) => c.subject_id === s.id).map(chapterStat);
    return { exam: e.slug, slug: s.slug, name: s.name, chapters: ch.length, chapters_with_questions: ch.filter((c) => c.question_count).length, questions: ch.reduce((a, c) => a + c.question_count, 0), pyq: ch.reduce((a, c) => a + c.pyq_count, 0) };
  });
  const srcMap = new Map<string, any>();
  for (const q of questions) {
    const k = q.source.title;
    if (!srcMap.has(k)) srcMap.set(k, { source_type: q.source.type, title: q.source.title, license: q.source.license, questions: 0 });
    srcMap.get(k).questions++;
  }
  for (const p of papers) if (p.source_title && !srcMap.has(p.source_title)) srcMap.set(p.source_title, { source_type: p.source_type, title: p.source_title, license: p.license, questions: 0 });
  return {
    generated_at: D.generated_at, exams: ex, subjects: subs,
    papers: papers.map((p) => ({ exam: exams.find((e) => e.id === p.exam_id).slug, year: p.year, public_id: p.public_id, title: p.title, kind: p.kind, availability: p.availability, verification_status: p.verification_status, questions: paperQuestionCount(p) })),
    sources: [...srcMap.values()],
    types: Object.keys(QUESTION_TYPE_LABELS).map((t) => ({ type: t, n: questions.filter((q) => q.type === t).length })).filter((t) => t.n),
  };
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

function customTest(sp: URLSearchParams) {
  const e = examBySlug(sp.get('exam') ?? '');
  const pairs = (sp.get('chapters') ?? '').split(',').map((x) => x.trim()).filter((x) => x.includes('/'));
  if (!pairs.length) fail(400, 'Select at least one chapter');
  const seed = sp.get('seed') ?? 'default';
  const n = Math.min(100, int(sp.get('n')) ?? 10);
  const rows = questions.filter((q) => q._exam_id === e.id && pairs.includes(`${q.subject.slug}/${q.chapter.slug}`));
  if (!rows.length) fail(409, 'No published questions are available in the selected chapters.');
  const picked = [...rows].sort((a, b) => hash(seed + a.public_id) - hash(seed + b.public_id)).slice(0, n);
  const def = Object.fromEntries(sp.entries());
  return {
    paper: { public_id: null, title: `${e.name} custom practice test`, kind: 'custom', duration_minutes: int(sp.get('minutes')) ?? Math.max(5, Math.round(picked.length * 2.5)), sections: [], marking_scheme: e.marking_scheme },
    exam: { slug: e.slug, name: e.name }, definition: def,
    items: picked.map((q, i) => ({ number: i + 1, section: q.subject.slug, marks: null, negative_marks: null, question: clean(q, false) })),
  };
}

function score(body: any) {
  const e = examBySlug(body.exam);
  let scheme = e.marking_scheme;
  const ov = new Map<number, any>();
  if (body.paper) {
    const p = papers.find((x) => x.public_id === body.paper) ?? fail(404, 'Paper not found');
    if (p.marking_scheme) scheme = p.marking_scheme;
    for (const l of links.filter((x) => x.paper_id === p.id)) ov.set(l.question_id, l);
  }
  let total = 0, max = 0;
  const summaryCounts = { correct: 0, wrong: 0, partial: 0, unattempted: 0, ungraded: 0 };
  const bySection: Record<string, any> = {};
  const items = (body.questions as string[]).map((pid) => qByPid.get(pid)).filter(Boolean).map((q: any) => {
    const o = ov.get(q.id);
    const rule = ruleFor(scheme, q.type, { marks: o?.marks ?? q.marks, negative_marks: o?.negative_marks ?? q.negative_marks });
    const response = body.responses[q.public_id] ?? null;
    const result = scoreResponse({ type: q.type, key: q.answer ? { value: q.answer.value, status: q.answer.status } : null, response, rule });
    total += result.marks;
    max += rule.correct;
    if (!q.answer) summaryCounts.ungraded++;
    else if (!result.attempted && q.answer.status !== 'dropped') summaryCounts.unattempted++;
    else if (result.correct) summaryCounts.correct++;
    else if (result.partial) summaryCounts.partial++;
    else summaryCounts.wrong++;
    const sec = o?.section_key ?? q.subject.slug;
    bySection[sec] ??= { score: 0, max: 0, correct: 0, attempted: 0, count: 0 };
    bySection[sec].score += result.marks;
    bySection[sec].max += rule.correct;
    bySection[sec].count++;
    if (result.attempted) bySection[sec].attempted++;
    if (result.correct) bySection[sec].correct++;
    return { public_id: q.public_id, rule, response, result, question: clean(q) };
  });
  return { paperId: null, total, max, summary: summaryCounts, by_section: bySection, items };
}

const UNAVAILABLE = 'This needs the full PrepLedger server. The static preview supports browsing, search, practice and timed tests only.';

export async function staticRequest(method: string, url: string, body?: any): Promise<any> {
  const u = new URL(url, 'http://local');
  const p = u.pathname.replace(/^\/api/, '');
  const sp = u.searchParams;
  let m: RegExpMatchArray | null;
  if (method === 'GET') {
    if (p === '/auth/me') return { user: null };
    if (p === '/exams') return examsList();
    if ((m = p.match(/^\/exams\/([^/]+)$/))) return examDetail(m[1]);
    if ((m = p.match(/^\/exams\/([^/]+)\/papers$/))) return paperList(m[1]);
    if ((m = p.match(/^\/exams\/([^/]+)\/subjects\/([^/]+)$/))) return subjectDetail(m[1], m[2]);
    if ((m = p.match(/^\/exams\/([^/]+)\/subjects\/([^/]+)\/chapters\/([^/]+)$/))) return chapterDetail(m[1], m[2], m[3], sp);
    if ((m = p.match(/^\/papers\/([^/]+)$/))) return paperDetail(m[1], true);
    if ((m = p.match(/^\/questions\/([^/]+)$/))) return questionDetail(m[1], sp);
    if (p === '/search') return search(sp);
    if (p === '/coverage') return coverage();
    if ((m = p.match(/^\/tests\/paper\/([^/]+)$/))) {
      const d = paperDetail(m[1], false);
      if (!d.items.length) fail(409, 'This paper has no questions available, so it cannot be attempted.');
      return d;
    }
    if (p === '/tests/custom') return customTest(sp);
  }
  if (method === 'POST' && p === '/tests/score') return score(body);
  fail(503, UNAVAILABLE);
}
