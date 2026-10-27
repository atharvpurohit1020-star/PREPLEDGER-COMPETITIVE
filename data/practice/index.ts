/**
 * Original practice-question batches. Each batch is imported once (keyed by its source title)
 * through the validating importer — see scripts/seed.ts.
 */
import type { ImportFile } from '../../shared/importSchema';
import { JEE_MAIN_CHEMISTRY } from './jeeMainChemistry';
import { JEE_MAIN_MATHS } from './jeeMainMaths';
import { JEE_MAIN_PHYSICS } from './jeeMainPhysics';
import { NEET_BIOLOGY } from './neetBiology';

export interface PracticeBatch { title: string; build: () => ImportFile }

const source = (title: string): ImportFile['source'] => ({
  source_type: 'original_sample',
  title,
  publisher: 'PrepLedger',
  license: 'CC BY 4.0 — original work authored for PrepLedger',
  rights_holder: 'PrepLedger contributors',
  permission_note: 'Original practice questions written from the public exam syllabi for this project. Not copied or paraphrased from any book, paper or website.',
  notes: 'Practice questions, not past-year questions. Answers and solutions are editorial.',
});

export const PRACTICE_BATCHES: PracticeBatch[] = [
  {
    title: 'PrepLedger original practice questions — batch 1',
    build: () => ({
      format_version: 1,
      source: source('PrepLedger original practice questions — batch 1'),
      papers: [], diagrams: [], passages: [],
      questions: [...JEE_MAIN_PHYSICS, ...JEE_MAIN_CHEMISTRY, ...JEE_MAIN_MATHS, ...NEET_BIOLOGY],
    }),
  },
];
