import { z } from 'zod';
import { QUESTION_TYPES } from './types';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug (a-z, 0-9, hyphens)');
const ref = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{1,80}$/, 'refs use letters, digits, . _ : - (2–81 chars)');

export const answerValueSchema = z.union([
  z.object({ options: z.array(z.string().regex(/^[A-Z]$/)).min(1) }).strict(),
  z.object({ numeric: z.number().finite(), tolerance: z.number().nonnegative().optional() }).strict(),
  z.object({ range: z.tuple([z.number().finite(), z.number().finite()]) }).strict(),
]);

export const answerKeySchema = z.object({
  value: answerValueSchema,
  status: z.enum(['provisional', 'final', 'revised', 'disputed', 'dropped']),
  source: z.enum(['official', 'independently_verified', 'editorial']),
  note: z.string().max(2000).optional(),
  effective_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const sourceSchema = z.object({
  source_type: z.enum(['official_document', 'licensed_dataset', 'original_sample', 'public_domain', 'user_contribution', 'test_fixture']),
  title: z.string().min(3).max(300),
  publisher: z.string().max(300).optional(),
  url: z.string().url().optional(),
  license: z.string().min(2).max(300),
  rights_holder: z.string().max(300).optional(),
  permission_note: z.string().min(10, 'explain why this content may lawfully be used').max(2000),
  retrieved_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
});

export const sectionSchema = z.object({
  key: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  subject_slug: slug.optional(),
  instructions: z.string().max(2000).optional(),
});

export const markingRuleSchema = z.object({
  correct: z.number(),
  wrong: z.number(),
  unattempted: z.number().optional(),
  partial: z.enum(['none', 'per_option']).optional(),
});
export const markingSchemeSchema = z
  .object({ note: z.string().optional() })
  .catchall(markingRuleSchema.or(z.string()));

export const paperImportSchema = z.object({
  ref,
  exam: slug,
  slug: slug.optional(),
  title: z.string().min(3).max(200),
  kind: z.enum(['past_paper', 'sample', 'test_fixture']),
  year: z.number().int().min(1950).max(2100).optional(),
  session: z.string().max(80).optional(),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  shift: z.string().max(40).optional(),
  paper_number: z.number().int().positive().optional(),
  language: z.string().max(40).optional(),
  duration_minutes: z.number().int().positive().max(600).optional(),
  total_marks: z.number().positive().optional(),
  marking_scheme: markingSchemeSchema.optional(),
  sections: z.array(sectionSchema).default([]),
  availability: z.enum(['full', 'partial', 'metadata_only']).default('metadata_only'),
  verification_status: z.enum(['unverified', 'verified', 'needs_correction']).default('unverified'),
  notes: z.string().max(2000).optional(),
});

export const diagramImportSchema = z.object({
  ref,
  url: z.string().regex(/^(\/assets\/|https:\/\/)/, 'diagram url must be /assets/... or https://'),
  alt_text: z.string().min(10, 'alt text must describe the diagram (≥10 chars)').max(1000),
  caption: z.string().max(300).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  license: z.string().min(2).max(300),
});

export const passageImportSchema = z.object({ ref, title: z.string().max(200).optional(), body: z.string().min(10) });

export const questionImportSchema = z.object({
  ref,
  exam: slug,
  subject: slug,
  chapter: slug,
  also_chapters: z.array(slug).optional(),
  topics: z.array(slug).optional(),
  type: z.enum(QUESTION_TYPES),
  body: z.string().min(5).max(20000),
  options: z.array(z.object({ label: z.string().regex(/^[A-Z]$/), body: z.string().min(1).max(5000) })).optional(),
  matrix: z
    .object({
      left_title: z.string().optional(),
      right_title: z.string().optional(),
      left: z.array(z.object({ key: z.string().min(1).max(4), body: z.string().min(1) })).min(2),
      right: z.array(z.object({ key: z.string().min(1).max(4), body: z.string().min(1) })).min(2),
    })
    .optional(),
  passage: ref.optional(),
  marks: z.number().optional(),
  negative_marks: z.number().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  is_pyq: z.boolean().default(false),
  status: z.enum(['draft', 'in_review', 'published', 'archived']).default('draft'),
  verification_status: z.enum(['unverified', 'verified', 'needs_correction']).default('unverified'),
  source_ref: z.string().max(300).optional(),
  answer: answerKeySchema,
  answer_history: z.array(answerKeySchema).optional(),
  solutions: z
    .array(
      z.object({
        kind: z.enum(['official', 'editorial', 'community']),
        method_label: z.string().max(120).optional(),
        body: z.string().min(1).max(20000),
        is_verified: z.boolean().default(false),
        author_name: z.string().max(120).optional(),
      }),
    )
    .default([]),
  papers: z
    .array(z.object({ paper: ref, number: z.number().int().positive(), section: z.string().max(40).optional(), marks: z.number().optional(), negative_marks: z.number().optional() }))
    .default([]),
});

export const importFileSchema = z.object({
  format_version: z.literal(1),
  source: sourceSchema,
  papers: z.array(paperImportSchema).default([]),
  diagrams: z.array(diagramImportSchema).default([]),
  passages: z.array(passageImportSchema).default([]),
  questions: z.array(questionImportSchema).default([]),
});

export type ImportFile = z.infer<typeof importFileSchema>;
export type QuestionImport = z.infer<typeof questionImportSchema>;
export type PaperImport = z.infer<typeof paperImportSchema>;

export interface ValidationIssue {
  level: 'error' | 'warning';
  path: string;
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  counts: { questions: number; papers: number; diagrams: number; passages: number };
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  duplicates: { ref: string; matches: string[]; reason: string }[];
}

/** Parse a CSV string (RFC 4180: quotes, escaped quotes, embedded newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

export const CSV_COLUMNS = [
  'ref', 'exam', 'subject', 'chapter', 'type', 'body',
  'option_a', 'option_b', 'option_c', 'option_d', 'option_e',
  'answer', 'answer_status', 'answer_source', 'answer_note',
  'solution', 'solution_kind', 'solution_verified',
  'marks', 'negative_marks', 'difficulty', 'is_pyq', 'status', 'verification_status',
  'topics', 'paper_ref', 'question_number', 'section', 'source_ref',
] as const;

/**
 * Convert CSV rows to question objects in the JSON import shape (still unvalidated).
 * answer column: "A" | "A;C" | "2.5" | "2.5±0.1" | "1.2..1.4"
 */
export function csvToQuestions(text: string): { questions: unknown[]; errors: ValidationIssue[] } {
  const rows = parseCsv(text);
  const errors: ValidationIssue[] = [];
  if (rows.length === 0) return { questions: [], errors: [{ level: 'error', path: 'csv', message: 'CSV is empty' }] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = ['ref', 'exam', 'subject', 'chapter', 'type', 'body', 'answer'].filter((c) => !header.includes(c));
  if (missing.length) errors.push({ level: 'error', path: 'csv.header', message: `missing required columns: ${missing.join(', ')}` });
  const unknown = header.filter((h) => !(CSV_COLUMNS as readonly string[]).includes(h));
  if (unknown.length) errors.push({ level: 'warning', path: 'csv.header', message: `ignored unknown columns: ${unknown.join(', ')}` });
  if (missing.length) return { questions: [], errors };
  const questions = rows.slice(1).map((r, idx) => {
    const get = (k: string) => {
      const i = header.indexOf(k);
      return i >= 0 ? (r[i] ?? '').trim() : '';
    };
    const options = ['a', 'b', 'c', 'd', 'e']
      .map((l) => ({ label: l.toUpperCase(), body: get(`option_${l}`) }))
      .filter((o) => o.body !== '');
    const ans = get('answer');
    let value: unknown;
    let m: RegExpMatchArray | null;
    if (/^[A-Z](;[A-Z])*$/.test(ans)) value = { options: ans.split(';') };
    else if ((m = ans.match(/^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/))) value = { range: [Number(m[1]), Number(m[2])] };
    else if ((m = ans.match(/^(-?\d+(?:\.\d+)?)±(\d+(?:\.\d+)?)$/))) value = { numeric: Number(m[1]), tolerance: Number(m[2]) };
    else if (/^-?\d+(?:\.\d+)?$/.test(ans)) value = { numeric: Number(ans) };
    else {
      errors.push({ level: 'error', path: `csv.row[${idx + 2}].answer`, message: `unrecognised answer "${ans}"` });
      value = null;
    }
    const num = (k: string) => (get(k) === '' ? undefined : Number(get(k)));
    const q: Record<string, unknown> = {
      ref: get('ref'),
      exam: get('exam'),
      subject: get('subject'),
      chapter: get('chapter'),
      type: get('type'),
      body: get('body'),
      options: options.length ? options : undefined,
      marks: num('marks'),
      negative_marks: num('negative_marks'),
      difficulty: get('difficulty') || undefined,
      is_pyq: get('is_pyq').toLowerCase() === 'true',
      status: get('status') || undefined,
      verification_status: get('verification_status') || undefined,
      source_ref: get('source_ref') || undefined,
      topics: get('topics') ? get('topics').split(';').map((s) => s.trim()) : undefined,
      answer: {
        value,
        status: get('answer_status') || 'final',
        source: get('answer_source') || 'editorial',
        note: get('answer_note') || undefined,
      },
      solutions: get('solution')
        ? [{ kind: get('solution_kind') || 'editorial', body: get('solution'), is_verified: get('solution_verified').toLowerCase() === 'true' }]
        : [],
      papers: get('paper_ref') ? [{ paper: get('paper_ref'), number: Number(get('question_number')), section: get('section') || undefined }] : [],
    };
    return q;
  });
  return { questions, errors };
}
