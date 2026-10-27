import { describe, expect, it } from 'vitest';
import { computeChapterStats, formatPercent } from '../../shared/stats';

describe('computeChapterStats', () => {
  const recs = [
    { questionId: 1, type: 'mcq_single' as const, isPyq: true, papers: [{ paperId: 10, year: 2022, kind: 'past_paper' }] },
    { questionId: 2, type: 'numerical' as const, isPyq: true, papers: [{ paperId: 11, year: 2023, kind: 'past_paper' }] },
    { questionId: 3, type: 'mcq_single' as const, isPyq: true, papers: [{ paperId: 12, year: 2023, kind: 'past_paper' }, { paperId: 99, year: null, kind: 'sample' }] },
    { questionId: 4, type: 'mcq_single' as const, isPyq: false, papers: [{ paperId: 99, year: null, kind: 'sample' }] },
    { questionId: 5, type: 'mcq_single' as const, isPyq: true, papers: [{ paperId: 13, year: 2025, kind: 'past_paper' }] },
  ];
  const s = computeChapterStats(recs, 20);
  it('counts totals, types, pyq vs sample', () => {
    expect(s.total).toBe(5);
    expect(s.pyqCount).toBe(4);
    expect(s.sampleCount).toBe(1);
    expect(s.byType).toEqual({ mcq_single: 4, numerical: 1 });
  });
  it('counts only past papers in year trends', () => {
    expect(s.byYear).toEqual([{ year: 2022, count: 1 }, { year: 2023, count: 2 }, { year: 2025, count: 1 }]);
    expect(s.yearsCovered).toEqual([2022, 2023, 2025]);
  });
  it('annual change only between consecutive years', () => {
    expect(s.annualChange).toEqual([{ year: 2023, delta: 1 }]);
  });
  it('papers and weightage', () => {
    expect(s.paperCount).toBe(5);
    expect(s.weightage).toBe(0.25);
    expect(formatPercent(s.weightage)).toBe('25.0%');
  });
  it('weightage is null when subject has no questions', () => {
    expect(computeChapterStats([], 0).weightage).toBeNull();
    expect(formatPercent(null)).toBe('—');
  });
});
