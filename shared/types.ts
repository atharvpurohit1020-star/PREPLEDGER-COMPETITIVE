export const QUESTION_TYPES = ['mcq_single', 'mcq_multi', 'numerical', 'integer', 'matrix_match', 'assertion_reason'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq_single: 'MCQ (Single Correct Answer)',
  mcq_multi: 'MCQ (More than One Correct Answer)',
  numerical: 'Numerical',
  integer: 'Integer Type',
  matrix_match: 'Matrix Match / List Match',
  assertion_reason: 'Assertion – Reason',
};

export type AnswerValue =
  | { options: string[] }
  | { numeric: number; tolerance?: number }
  | { range: [number, number] };

export type AnswerKeyStatus = 'provisional' | 'final' | 'revised' | 'disputed' | 'dropped';
export type AnswerKeySource = 'official' | 'independently_verified' | 'editorial';

export const ANSWER_SOURCE_LABELS: Record<AnswerKeySource, string> = {
  official: 'Official answer key',
  independently_verified: 'Independently verified (not official)',
  editorial: 'Editorial answer (not official)',
};

export const ANSWER_STATUS_LABELS: Record<AnswerKeyStatus, string> = {
  provisional: 'Provisional',
  final: 'Final',
  revised: 'Revised',
  disputed: 'Disputed',
  dropped: 'Dropped / bonus',
};

export type Response = { options: string[] } | { value: number } | null;

export interface DiagramRef {
  public_id: string;
  url: string;
  alt_text: string;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface MarkingRule {
  correct: number;
  wrong: number;
  unattempted?: number;
  /** 'per_option': +1 per correct option chosen if no wrong option chosen (JEE Advanced 2022–24 style). */
  partial?: 'none' | 'per_option';
}
export type MarkingScheme = Partial<Record<QuestionType, MarkingRule>> & { note?: string };

export interface OptionDTO {
  label: string;
  body: string;
}

export interface AnswerKeyDTO {
  version: number;
  value: AnswerValue;
  status: AnswerKeyStatus;
  source: AnswerKeySource;
  is_current: boolean;
  note?: string | null;
  effective_at?: string | null;
}

export interface SolutionDTO {
  kind: 'official' | 'editorial' | 'community';
  method_label?: string | null;
  body: string;
  is_verified: boolean;
  author_name?: string | null;
}
