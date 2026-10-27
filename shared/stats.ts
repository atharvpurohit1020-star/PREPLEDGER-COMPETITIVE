import type { QuestionType } from './types';

/**
 * Chapter statistics. Every figure is derived only from the records passed in; the caller
 * is responsible for disclosing that the dataset may be incomplete (see docs/METRICS.md).
 */
export interface StatRecord {
  questionId: number;
  type: QuestionType;
  isPyq: boolean;
  papers: { paperId: number; year: number | null; kind: string }[];
}

export interface ChapterStats {
  total: number;
  pyqCount: number;
  sampleCount: number;
  byType: Partial<Record<QuestionType, number>>;
  /** questions per exam year — only past papers with a year count */
  byYear: { year: number; count: number }[];
  yearsCovered: number[];
  paperCount: number;
  /** share of the subject's records that fall in this chapter (0–1), null when the subject has none */
  weightage: number | null;
  /** year-over-year change in question count, only between consecutive available years */
  annualChange: { year: number; delta: number }[];
}

export function computeChapterStats(records: StatRecord[], subjectTotal: number): ChapterStats {
  const byType: Partial<Record<QuestionType, number>> = {};
  const yearCounts = new Map<number, Set<number>>();
  const papers = new Set<number>();
  let pyq = 0;
  for (const r of records) {
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    if (r.isPyq) pyq++;
    for (const p of r.papers) {
      papers.add(p.paperId);
      if (p.kind === 'past_paper' && p.year != null) {
        if (!yearCounts.has(p.year)) yearCounts.set(p.year, new Set());
        yearCounts.get(p.year)!.add(r.questionId);
      }
    }
  }
  const byYear = [...yearCounts.entries()].map(([year, s]) => ({ year, count: s.size })).sort((a, b) => a.year - b.year);
  const annualChange: { year: number; delta: number }[] = [];
  for (let i = 1; i < byYear.length; i++) {
    if (byYear[i].year === byYear[i - 1].year + 1) annualChange.push({ year: byYear[i].year, delta: byYear[i].count - byYear[i - 1].count });
  }
  return {
    total: records.length,
    pyqCount: pyq,
    sampleCount: records.length - pyq,
    byType,
    byYear,
    yearsCovered: byYear.map((y) => y.year),
    paperCount: papers.size,
    weightage: subjectTotal > 0 ? records.length / subjectTotal : null,
    annualChange,
  };
}

export function formatPercent(x: number | null): string {
  if (x == null) return '—';
  return `${(x * 100).toFixed(1)}%`;
}
