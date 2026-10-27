import type { AnswerKeyStatus, AnswerValue, MarkingRule, MarkingScheme, QuestionType, Response } from './types';

export interface ScoreInput {
  type: QuestionType;
  key: { value: AnswerValue; status: AnswerKeyStatus } | null;
  response: Response;
  rule: MarkingRule;
}

export interface ScoreResult {
  attempted: boolean;
  /** null when correctness cannot be decided (no answer key) */
  correct: boolean | null;
  partial: boolean;
  marks: number;
}

export function isAttempted(r: Response): boolean {
  if (!r) return false;
  if ('options' in r) return r.options.length > 0;
  return typeof r.value === 'number' && Number.isFinite(r.value);
}

export function numericMatches(value: number, key: AnswerValue): boolean {
  if ('range' in key) return value >= key.range[0] - 1e-9 && value <= key.range[1] + 1e-9;
  if ('numeric' in key) return Math.abs(value - key.numeric) <= (key.tolerance ?? 0) + 1e-9;
  return false;
}

/**
 * Evaluate a response against the current answer key.
 *   - Dropped questions award full marks to every candidate (documented choice; configurable later).
 *   - Single-correct types accept any option listed in the key (revised keys may accept more than one).
 *   - Multi-correct with partial='per_option': +1 per correct option when no wrong option is chosen.
 */
export function scoreResponse({ type, key, response, rule }: ScoreInput): ScoreResult {
  const attempted = isAttempted(response);
  const unattempted = rule.unattempted ?? 0;
  if (!key) return { attempted, correct: null, partial: false, marks: 0 };
  if (key.status === 'dropped') return { attempted, correct: true, partial: false, marks: rule.correct };
  if (!attempted || !response) return { attempted: false, correct: null, partial: false, marks: unattempted };

  const v = key.value;
  if (type === 'numerical' || type === 'integer') {
    if (!('value' in response)) return { attempted, correct: false, partial: false, marks: rule.wrong };
    const ok = numericMatches(response.value, v);
    return { attempted, correct: ok, partial: false, marks: ok ? rule.correct : rule.wrong };
  }
  if (!('options' in response) || !('options' in v)) return { attempted, correct: false, partial: false, marks: rule.wrong };
  const chosen = new Set(response.options);
  const correctSet = new Set(v.options);

  if (type === 'mcq_multi') {
    const anyWrong = [...chosen].some((o) => !correctSet.has(o));
    if (anyWrong) return { attempted, correct: false, partial: false, marks: rule.wrong };
    if (chosen.size === correctSet.size) return { attempted, correct: true, partial: false, marks: rule.correct };
    if (rule.partial === 'per_option') return { attempted, correct: false, partial: true, marks: chosen.size };
    return { attempted, correct: false, partial: false, marks: rule.wrong };
  }
  // single-correct family (mcq_single, matrix_match, assertion_reason)
  const ok = chosen.size === 1 && correctSet.has([...chosen][0]);
  return { attempted, correct: ok, partial: false, marks: ok ? rule.correct : rule.wrong };
}

export const DEFAULT_RULE: MarkingRule = { correct: 4, wrong: -1, unattempted: 0, partial: 'none' };

export function ruleFor(scheme: MarkingScheme | null | undefined, type: QuestionType, override?: { marks?: number | null; negative_marks?: number | null }): MarkingRule {
  const base = scheme?.[type] ?? scheme?.mcq_single ?? DEFAULT_RULE;
  return {
    ...base,
    correct: override?.marks ?? base.correct,
    wrong: override?.negative_marks != null ? -Math.abs(override.negative_marks) : base.wrong,
  };
}

/** Is this response correct (ignoring marks)? Used by chapter practice. */
export function checkResponse(type: QuestionType, value: AnswerValue, response: Response): boolean {
  const r = scoreResponse({ type, key: { value, status: 'final' }, response, rule: { correct: 1, wrong: 0, partial: 'none' } });
  return r.correct === true;
}

export function formatAnswer(value: AnswerValue): string {
  if ('options' in value) return value.options.join(', ');
  if ('range' in value) return `${value.range[0]} to ${value.range[1]}`;
  return value.tolerance ? `${value.numeric} (± ${value.tolerance})` : String(value.numeric);
}
