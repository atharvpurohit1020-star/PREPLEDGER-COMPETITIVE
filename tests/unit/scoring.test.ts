import { describe, expect, it } from 'vitest';
import { checkResponse, formatAnswer, ruleFor, scoreResponse } from '../../shared/scoring';

const R = { correct: 4, wrong: -1, partial: 'none' as const };
const ADV = { correct: 4, wrong: -2, partial: 'per_option' as const };

describe('scoreResponse', () => {
  it('single correct: right, wrong, unattempted', () => {
    const key = { value: { options: ['B'] }, status: 'final' as const };
    expect(scoreResponse({ type: 'mcq_single', key, response: { options: ['B'] }, rule: R }).marks).toBe(4);
    expect(scoreResponse({ type: 'mcq_single', key, response: { options: ['A'] }, rule: R }).marks).toBe(-1);
    const u = scoreResponse({ type: 'mcq_single', key, response: null, rule: R });
    expect(u).toMatchObject({ attempted: false, marks: 0 });
  });
  it('revised key accepting two options', () => {
    const key = { value: { options: ['A', 'C'] }, status: 'revised' as const };
    expect(scoreResponse({ type: 'mcq_single', key, response: { options: ['C'] }, rule: R }).correct).toBe(true);
  });
  it('dropped question gives full marks to everyone', () => {
    const key = { value: { options: ['A'] }, status: 'dropped' as const };
    expect(scoreResponse({ type: 'mcq_single', key, response: null, rule: R }).marks).toBe(4);
    expect(scoreResponse({ type: 'mcq_single', key, response: { options: ['D'] }, rule: R }).marks).toBe(4);
  });
  it('multi-correct JEE Advanced partial marking', () => {
    const key = { value: { options: ['A', 'B', 'C'] }, status: 'final' as const };
    expect(scoreResponse({ type: 'mcq_multi', key, response: { options: ['A', 'B', 'C'] }, rule: ADV }).marks).toBe(4);
    expect(scoreResponse({ type: 'mcq_multi', key, response: { options: ['A', 'B'] }, rule: ADV })).toMatchObject({ marks: 2, partial: true });
    expect(scoreResponse({ type: 'mcq_multi', key, response: { options: ['A'] }, rule: ADV }).marks).toBe(1);
    expect(scoreResponse({ type: 'mcq_multi', key, response: { options: ['A', 'D'] }, rule: ADV }).marks).toBe(-2);
  });
  it('multi-correct without partial scheme gives wrong marks for incomplete', () => {
    const key = { value: { options: ['A', 'B'] }, status: 'final' as const };
    expect(scoreResponse({ type: 'mcq_multi', key, response: { options: ['A'] }, rule: R }).marks).toBe(-1);
  });
  it('numerical with tolerance and range', () => {
    expect(scoreResponse({ type: 'numerical', key: { value: { numeric: 2.5, tolerance: 0.1 }, status: 'final' }, response: { value: 2.58 }, rule: R }).correct).toBe(true);
    expect(scoreResponse({ type: 'numerical', key: { value: { numeric: 2.5, tolerance: 0.1 }, status: 'final' }, response: { value: 2.7 }, rule: R }).correct).toBe(false);
    expect(scoreResponse({ type: 'numerical', key: { value: { range: [0.62, 0.64] }, status: 'final' }, response: { value: 0.64 }, rule: R }).correct).toBe(true);
    expect(scoreResponse({ type: 'integer', key: { value: { numeric: 10 }, status: 'final' }, response: { value: 10 }, rule: R }).marks).toBe(4);
  });
  it('no answer key yields ungraded', () => {
    expect(scoreResponse({ type: 'mcq_single', key: null, response: { options: ['A'] }, rule: R })).toMatchObject({ correct: null, marks: 0 });
  });
});

describe('ruleFor / helpers', () => {
  it('applies per-question mark overrides', () => {
    expect(ruleFor({ mcq_single: { correct: 1, wrong: 0 } }, 'mcq_single', { marks: 2, negative_marks: null })).toMatchObject({ correct: 2, wrong: 0 });
    expect(ruleFor({ mcq_single: { correct: 4, wrong: -1 } }, 'mcq_single', { marks: null, negative_marks: 0.25 }).wrong).toBe(-0.25);
  });
  it('falls back to mcq_single rule for unknown types', () => {
    expect(ruleFor({ mcq_single: { correct: 3, wrong: -1 } }, 'assertion_reason').correct).toBe(3);
  });
  it('checkResponse and formatAnswer', () => {
    expect(checkResponse('mcq_multi', { options: ['A', 'C'] }, { options: ['C', 'A'] })).toBe(true);
    expect(formatAnswer({ range: [1, 2] })).toBe('1 to 2');
    expect(formatAnswer({ numeric: 3, tolerance: 0.1 })).toBe('3 (± 0.1)');
    expect(formatAnswer({ options: ['A', 'B'] })).toBe('A, B');
  });
});
