/**
 * Compact builders for PrepLedger original practice questions.
 * Every question written with these is original work, is_pyq=false, editorial answer and solution.
 */
import type { QuestionImport } from '../../shared/importSchema';

export const r = String.raw;
const AUTHOR = 'PrepLedger editorial';

export interface Ctx { exam: string; subject: string; prefix: string }

type Diff = 'easy' | 'medium' | 'hard';

export function builder(ctx: Ctx) {
  const counters = new Map<string, number>();
  const ref = (chapter: string) => {
    const n = (counters.get(chapter) ?? 0) + 1;
    counters.set(chapter, n);
    return `${ctx.prefix}.${chapter}.${n}`;
  };
  const base = (chapter: string, body: string, solution: string, difficulty: Diff = 'medium'): Omit<QuestionImport, 'type' | 'answer'> => ({
    ref: ref(chapter), exam: ctx.exam, subject: ctx.subject, chapter, body, difficulty,
    is_pyq: false, status: 'published', verification_status: 'unverified',
    solutions: [{ kind: 'editorial', body: solution, is_verified: false, author_name: AUTHOR }], papers: [],
  });
  const key = (value: QuestionImport['answer']['value']): QuestionImport['answer'] => ({ value, status: 'final', source: 'editorial' });
  return {
    /** single-correct MCQ; `ans` is the correct option letter */
    mcq(chapter: string, body: string, options: string[], ans: string, solution: string, difficulty?: Diff): QuestionImport {
      return { ...base(chapter, body, solution, difficulty), type: 'mcq_single', options: options.map((b, i) => ({ label: String.fromCharCode(65 + i), body: b })), answer: key({ options: [ans] }) };
    },
    /** multi-correct MCQ */
    multi(chapter: string, body: string, options: string[], ans: string[], solution: string, difficulty?: Diff): QuestionImport {
      return { ...base(chapter, body, solution, difficulty), type: 'mcq_multi', options: options.map((b, i) => ({ label: String.fromCharCode(65 + i), body: b })), answer: key({ options: ans }) };
    },
    /** numerical answer; tolerance optional */
    num(chapter: string, body: string, ans: number, solution: string, opts: { tol?: number; integer?: boolean; difficulty?: Diff } = {}): QuestionImport {
      return { ...base(chapter, body, solution, opts.difficulty), type: opts.integer ? 'integer' : 'numerical', answer: key(opts.tol ? { numeric: ans, tolerance: opts.tol } : { numeric: ans }) };
    },
    int(chapter: string, body: string, ans: number, solution: string, difficulty?: Diff): QuestionImport {
      return { ...base(chapter, body, solution, difficulty), type: 'integer', answer: key({ numeric: ans }) };
    },
  };
}
