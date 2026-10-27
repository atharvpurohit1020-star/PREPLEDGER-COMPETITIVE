import { describe, expect, it } from 'vitest';
import { csvToQuestions, importFileSchema, parseCsv } from '../../shared/importSchema';
import { buildSampleImport } from '../../data/sample/sampleDataset';
import { ALL_SAMPLE_QUESTIONS } from '../../data/sample/sampleDataset';
import { EXAMS } from '../../data/taxonomy';
import fs from 'node:fs';
import path from 'node:path';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas and newlines', () => {
    expect(parseCsv('a,b\n"x, y","he said ""hi""\nline2"\n')).toEqual([['a', 'b'], ['x, y', 'he said "hi"\nline2']]);
  });
});

describe('csvToQuestions', () => {
  it('maps answers of every format', () => {
    const csv = 'ref,exam,subject,chapter,type,body,option_a,option_b,answer\nr1,jee-main,physics,waves,mcq_single,Q,a,b,B\nr2,jee-main,physics,waves,mcq_multi,Q,a,b,A;B\nr3,jee-main,physics,waves,numerical,Q,,,2.5±0.1\nr4,jee-main,physics,waves,numerical,Q,,,1..2';
    const { questions, errors } = csvToQuestions(csv);
    expect(errors).toEqual([]);
    expect((questions as any[]).map((q) => q.answer.value)).toEqual([{ options: ['B'] }, { options: ['A', 'B'] }, { numeric: 2.5, tolerance: 0.1 }, { range: [1, 2] }]);
  });
  it('reports missing columns and bad answers', () => {
    expect(csvToQuestions('ref,exam\nx,y').errors[0].message).toMatch(/missing required columns/);
    expect(csvToQuestions('ref,exam,subject,chapter,type,body,answer\nr,e,s,c,mcq_single,b,??').errors[0].message).toMatch(/unrecognised answer/);
  });
  it('the shipped CSV template parses cleanly', () => {
    const csv = fs.readFileSync(path.resolve(__dirname, '../../data/import-templates/questions-template.csv'), 'utf8');
    expect(csvToQuestions(csv).errors).toEqual([]);
  });
});

describe('import schema', () => {
  it('sample dataset and JSON template pass the schema', () => {
    expect(importFileSchema.safeParse(buildSampleImport()).success).toBe(true);
    const tpl = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/import-templates/questions-template.json'), 'utf8'));
    expect(importFileSchema.safeParse(tpl).success).toBe(true);
  });
  it('rejects bad slugs and missing permission notes', () => {
    const f = buildSampleImport();
    f.questions[0].exam = 'Bad Slug';
    f.source.permission_note = 'short';
    const r = importFileSchema.safeParse(f);
    expect(r.success).toBe(false);
  });
});

describe('sample dataset integrity', () => {
  it('never claims PYQ status or official keys', () => {
    for (const q of ALL_SAMPLE_QUESTIONS) {
      expect(q.is_pyq).toBe(false);
      expect(q.answer.source).not.toBe('official');
      for (const s of q.solutions) expect(s.kind).not.toBe('official');
    }
  });
  it('references only chapters that exist in the taxonomy', () => {
    for (const q of ALL_SAMPLE_QUESTIONS) {
      const e = EXAMS.find((x) => x.slug === q.exam)!;
      const s = e.subjects.find((x) => x.slug === q.subject)!;
      expect(s.chapters.some((c) => c.slug === q.chapter), `${q.ref} → ${q.chapter}`).toBe(true);
    }
  });
  it('covers every question type', () => {
    const types = new Set(ALL_SAMPLE_QUESTIONS.map((q) => q.type));
    for (const t of ['mcq_single', 'mcq_multi', 'numerical', 'integer', 'matrix_match', 'assertion_reason']) expect(types.has(t as any)).toBe(true);
  });
});
