import type { AnswerKeyDTO, DiagramRef, QuestionType, SolutionDTO } from '../../shared/types';

export interface PaperLink { public_id: string; slug: string; title: string; year: number | null; kind: string; exam_date: string | null; shift: string | null; question_number: number; section_key: string | null }

export interface Question {
  id: number;
  public_id: string;
  type: QuestionType;
  type_label: string;
  body: string;
  matrix: { left_title?: string; right_title?: string; left: { key: string; body: string }[]; right: { key: string; body: string }[] } | null;
  marks: number | null;
  negative_marks: number | null;
  difficulty: string | null;
  is_pyq: boolean;
  status: string;
  verification_status: 'unverified' | 'verified' | 'needs_correction';
  exam: { slug: string; name: string; category: string };
  subject: { slug: string; name: string };
  chapter: { slug: string; name: string };
  also_chapters: { slug: string; name: string }[];
  topics: { slug: string; name: string }[];
  passage: { public_id: string; title: string | null; body: string } | null;
  options: { label: string; body: string }[];
  answer?: (AnswerKeyDTO & { created_at?: string }) | null;
  answer_history?: (AnswerKeyDTO & { created_at?: string })[];
  solutions?: (SolutionDTO & { id: number })[];
  diagrams: Record<string, DiagramRef>;
  papers: PaperLink[];
  source: { type: string; title: string; license: string; permission?: string; ref?: string };
}
