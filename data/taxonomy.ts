/**
 * Exam taxonomy for PrepLedger.
 *
 * Scope (per project brief, revised): JEE Main, JEE Advanced, NEET and engineering entrance exams.
 * `onReference` = the exam is listed on the reference site's homepage per the brief.
 * `slugObserved` = this URL slug was observed in search-index URLs of the reference during the audit
 *   (docs/AUDIT.md). Unobserved slugs are our own choice.
 * Chapter lists follow the public syllabi units of each exam; they are a navigation taxonomy, not content.
 */
import type { MarkingScheme } from '../shared/types';

export interface ChapterDef { slug: string; name: string; unit: string; removed2024?: boolean }
export interface SubjectDef { slug: string; name: string; chapters: ChapterDef[] }
export interface ExamDef {
  slug: string;
  category: 'jee' | 'medical';
  name: string;
  shortName: string;
  fullName: string;
  conductingBody: string;
  region: string;
  description: string;
  onReference: boolean;
  slugObserved: boolean;
  markingScheme: MarkingScheme;
  markingNote: string;
  subjects: SubjectDef[];
}

const u = (unit: string, list: [string, string, boolean?][]): ChapterDef[] =>
  list.map(([slug, name, removed2024]) => ({ slug, name, unit, removed2024 }));

export const PHYSICS: ChapterDef[] = [
  ...u('Mechanics', [
    ['units-and-measurements', 'Units & Measurements'],
    ['motion-in-a-straight-line', 'Motion in a Straight Line'],
    ['motion-in-a-plane', 'Motion in a Plane'],
    ['laws-of-motion', 'Laws of Motion'],
    ['work-power-and-energy', 'Work Power & Energy'],
    ['center-of-mass-and-collision', 'Center of Mass and Collision'],
    ['rotational-motion', 'Rotational Motion'],
    ['gravitation', 'Gravitation'],
  ]),
  ...u('Properties of Matter', [
    ['properties-of-matter', 'Properties of Solids (Elasticity)'],
    ['fluid-mechanics', 'Fluid Mechanics'],
  ]),
  ...u('Heat and Thermodynamics', [['heat-and-thermodynamics', 'Heat and Thermodynamics']]),
  ...u('Oscillations and Waves', [
    ['simple-harmonic-motion', 'Simple Harmonic Motion'],
    ['waves', 'Waves'],
  ]),
  ...u('Electricity and Magnetism', [
    ['electrostatics', 'Electrostatics'],
    ['capacitor', 'Capacitor'],
    ['current-electricity', 'Current Electricity'],
    ['magnetic-effects-of-current', 'Magnetic Effects of Current'],
    ['magnetic-properties-of-matter', 'Magnetic Properties of Matter'],
    ['electromagnetic-induction', 'Electromagnetic Induction'],
    ['alternating-current', 'Alternating Current'],
    ['electromagnetic-waves', 'Electromagnetic Waves'],
  ]),
  ...u('Optics', [
    ['geometrical-optics', 'Geometrical Optics'],
    ['wave-optics', 'Wave Optics'],
  ]),
  ...u('Modern Physics', [
    ['dual-nature-of-radiation', 'Dual Nature of Radiation'],
    ['atoms-and-nuclei', 'Atoms and Nuclei'],
    ['electronic-devices', 'Semiconductor'],
    ['communication-systems', 'Communication Systems', true],
  ]),
];

export const CHEMISTRY: ChapterDef[] = [
  ...u('Physical Chemistry', [
    ['some-basic-concepts-of-chemistry', 'Some Basic Concepts of Chemistry'],
    ['structure-of-atom', 'Structure of Atom'],
    ['gaseous-state', 'Gaseous State', true],
    ['solid-state', 'Solid State', true],
    ['thermodynamics', 'Thermodynamics'],
    ['chemical-equilibrium', 'Chemical Equilibrium'],
    ['ionic-equilibrium', 'Ionic Equilibrium'],
    ['redox-reactions', 'Redox Reactions'],
    ['solutions', 'Solutions'],
    ['electrochemistry', 'Electrochemistry'],
    ['chemical-kinetics', 'Chemical Kinetics and Nuclear Chemistry'],
    ['surface-chemistry', 'Surface Chemistry', true],
  ]),
  ...u('Inorganic Chemistry', [
    ['periodic-table-and-periodicity', 'Periodic Table & Periodicity'],
    ['chemical-bonding-and-molecular-structure', 'Chemical Bonding & Molecular Structure'],
    ['hydrogen', 'Hydrogen', true],
    ['s-block-elements', 's-Block Elements', true],
    ['p-block-elements', 'p-Block Elements'],
    ['d-and-f-block-elements', 'd and f Block Elements'],
    ['coordination-compounds', 'Coordination Compounds'],
    ['isolation-of-elements', 'Isolation of Elements', true],
    ['environmental-chemistry', 'Environmental Chemistry', true],
  ]),
  ...u('Organic Chemistry', [
    ['basics-of-organic-chemistry', 'Basics of Organic Chemistry'],
    ['isomerism', 'Isomerism'],
    ['hydrocarbons', 'Hydrocarbons'],
    ['haloalkanes-and-haloarenes', 'Haloalkanes and Haloarenes'],
    ['alcohols-phenols-and-ethers', 'Alcohols, Phenols and Ethers'],
    ['aldehydes-ketones-and-carboxylic-acids', 'Aldehydes, Ketones and Carboxylic Acids'],
    ['compounds-containing-nitrogen', 'Compounds Containing Nitrogen'],
    ['biomolecules', 'Biomolecules'],
    ['polymers', 'Polymers', true],
    ['chemistry-in-everyday-life', 'Chemistry in Everyday Life', true],
    ['practical-organic-chemistry', 'Practical Organic Chemistry'],
  ]),
];

export const MATHEMATICS: ChapterDef[] = [
  ...u('Algebra', [
    ['sets-and-relations', 'Sets and Relations'],
    ['logarithm', 'Logarithm'],
    ['quadratic-equation-and-inequalities', 'Quadratic Equation and Inequalities'],
    ['complex-numbers', 'Complex Numbers'],
    ['sequences-and-series', 'Sequences and Series'],
    ['permutations-and-combinations', 'Permutations and Combinations'],
    ['mathematical-induction', 'Mathematical Induction', true],
    ['binomial-theorem', 'Binomial Theorem'],
    ['matrices-and-determinants', 'Matrices and Determinants'],
    ['probability', 'Probability'],
    ['statistics', 'Statistics'],
    ['mathematical-reasoning', 'Mathematical Reasoning', true],
  ]),
  ...u('Trigonometry', [
    ['trigonometric-ratios-and-identities', 'Trigonometric Ratios & Identities'],
    ['trigonometric-equations', 'Trigonometric Equations'],
    ['inverse-trigonometric-functions', 'Inverse Trigonometric Functions'],
    ['properties-of-triangle', 'Properties of Triangle'],
    ['height-and-distance', 'Height and Distance', true],
  ]),
  ...u('Coordinate Geometry', [
    ['straight-lines-and-pair-of-straight-lines', 'Straight Lines and Pair of Straight Lines'],
    ['circle', 'Circle'],
    ['parabola', 'Parabola'],
    ['ellipse', 'Ellipse'],
    ['hyperbola', 'Hyperbola'],
  ]),
  ...u('Calculus', [
    ['functions', 'Functions'],
    ['limits-continuity-and-differentiability', 'Limits, Continuity and Differentiability'],
    ['differentiation', 'Differentiation'],
    ['application-of-derivatives', 'Application of Derivatives'],
    ['indefinite-integrals', 'Indefinite Integrals'],
    ['definite-integration', 'Definite Integration'],
    ['area-under-the-curves', 'Area Under The Curves'],
    ['differential-equations', 'Differential Equations'],
  ]),
  ...u('Vector and 3D Geometry', [
    ['vector-algebra', 'Vector Algebra'],
    ['3d-geometry', '3D Geometry'],
  ]),
];

export const BIOLOGY: ChapterDef[] = [
  ...u('Diversity in Living World', [
    ['the-living-world', 'The Living World'],
    ['biological-classification', 'Biological Classification'],
    ['plant-kingdom', 'Plant Kingdom'],
    ['animal-kingdom', 'Animal Kingdom'],
  ]),
  ...u('Structural Organisation', [
    ['morphology-of-flowering-plants', 'Morphology of Flowering Plants'],
    ['anatomy-of-flowering-plants', 'Anatomy of Flowering Plants'],
    ['structural-organisation-in-animals', 'Structural Organisation in Animals'],
  ]),
  ...u('Cell Structure and Function', [
    ['cell-the-unit-of-life', 'Cell: The Unit of Life'],
    ['biomolecules', 'Biomolecules'],
    ['cell-cycle-and-cell-division', 'Cell Cycle and Cell Division'],
  ]),
  ...u('Plant Physiology', [
    ['photosynthesis-in-higher-plants', 'Photosynthesis in Higher Plants'],
    ['respiration-in-plants', 'Respiration in Plants'],
    ['plant-growth-and-development', 'Plant Growth and Development'],
  ]),
  ...u('Human Physiology', [
    ['breathing-and-exchange-of-gases', 'Breathing and Exchange of Gases'],
    ['body-fluids-and-circulation', 'Body Fluids and Circulation'],
    ['excretory-products-and-their-elimination', 'Excretory Products and their Elimination'],
    ['locomotion-and-movement', 'Locomotion and Movement'],
    ['neural-control-and-coordination', 'Neural Control and Coordination'],
    ['chemical-coordination-and-integration', 'Chemical Coordination and Integration'],
  ]),
  ...u('Reproduction', [
    ['sexual-reproduction-in-flowering-plants', 'Sexual Reproduction in Flowering Plants'],
    ['human-reproduction', 'Human Reproduction'],
    ['reproductive-health', 'Reproductive Health'],
  ]),
  ...u('Genetics and Evolution', [
    ['principles-of-inheritance-and-variation', 'Principles of Inheritance and Variation'],
    ['molecular-basis-of-inheritance', 'Molecular Basis of Inheritance'],
    ['evolution', 'Evolution'],
  ]),
  ...u('Biology and Human Welfare', [
    ['human-health-and-diseases', 'Human Health and Disease'],
    ['microbes-in-human-welfare', 'Microbes in Human Welfare'],
  ]),
  ...u('Biotechnology', [
    ['biotechnology-principles-and-processes', 'Biotechnology: Principles and Processes'],
    ['biotechnology-and-its-applications', 'Biotechnology and its Applications'],
  ]),
  ...u('Ecology', [
    ['organisms-and-populations', 'Organisms and Populations'],
    ['ecosystem', 'Ecosystem'],
    ['biodiversity-and-conservation', 'Biodiversity and Conservation'],
  ]),
];

const strip = (list: ChapterDef[]) => list.map(({ removed2024: _r, ...c }) => c);

const ENGLISH_BITSAT = u('English Proficiency', [
  ['grammar', 'Grammar'],
  ['vocabulary', 'Vocabulary'],
  ['reading-comprehension', 'Reading Comprehension'],
  ['composition', 'Composition'],
]);
const LOGICAL_BITSAT = u('Logical Reasoning', [
  ['verbal-reasoning', 'Verbal Reasoning'],
  ['non-verbal-reasoning', 'Non-verbal Reasoning'],
]);
const ENGLISH_VIT = u('English', [
  ['grammar', 'Grammar'],
  ['vocabulary', 'Vocabulary'],
  ['reading-comprehension', 'Reading Comprehension'],
]);
const APTITUDE_VIT = u('Aptitude', [
  ['quantitative-aptitude', 'Quantitative Aptitude'],
  ['logical-reasoning', 'Logical Reasoning'],
  ['data-interpretation', 'Data Interpretation'],
]);

const pcm = (opts: { removedFlags?: boolean } = {}): SubjectDef[] => {
  const f = (l: ChapterDef[]) => (opts.removedFlags ? l : strip(l));
  return [
    { slug: 'physics', name: 'Physics', chapters: f(PHYSICS) },
    { slug: 'chemistry', name: 'Chemistry', chapters: f(CHEMISTRY) },
    { slug: 'mathematics', name: 'Mathematics', chapters: f(MATHEMATICS) },
  ];
};

const single = (correct: number, wrong: number): MarkingScheme => ({
  mcq_single: { correct, wrong },
  assertion_reason: { correct, wrong },
  matrix_match: { correct, wrong },
});

export const EXAMS: ExamDef[] = [
  {
    slug: 'jee-main', category: 'jee', name: 'JEE Main', shortName: 'JEE Main', fullName: 'Joint Entrance Examination (Main)',
    conductingBody: 'National Testing Agency (NTA)', region: 'National',
    description: 'National engineering entrance for NITs, IIITs and GFTIs; also the qualifying exam for JEE Advanced.',
    onReference: true, slugObserved: true,
    markingScheme: { ...single(4, -1), numerical: { correct: 4, wrong: -1 }, integer: { correct: 4, wrong: -1 } },
    markingNote: 'Modelled on the publicly described 2024 pattern (+4 / −1 for both sections). Verify against the official information bulletin for each year.',
    subjects: pcm({ removedFlags: true }),
  },
  {
    slug: 'jee-advanced', category: 'jee', name: 'JEE Advanced', shortName: 'JEE Advanced', fullName: 'Joint Entrance Examination (Advanced)',
    conductingBody: 'IITs (organising institute rotates each year)', region: 'National',
    description: 'Entrance examination for admission to the IITs. Paper pattern and marking scheme change from year to year.',
    onReference: true, slugObserved: false,
    markingScheme: {
      mcq_single: { correct: 3, wrong: -1 },
      mcq_multi: { correct: 4, wrong: -2, partial: 'per_option' },
      numerical: { correct: 4, wrong: 0 },
      integer: { correct: 4, wrong: 0 },
      matrix_match: { correct: 3, wrong: -1 },
    },
    markingNote: 'Representative scheme only — JEE Advanced changes its scheme every year. Paper records may override it.',
    subjects: pcm(),
  },
  {
    slug: 'mht-cet', category: 'jee', name: 'MHT CET', shortName: 'MHT CET', fullName: 'Maharashtra Common Entrance Test',
    conductingBody: 'State CET Cell, Maharashtra', region: 'Maharashtra',
    description: 'State engineering entrance for Maharashtra (PCM group).',
    onReference: true, slugObserved: true,
    markingScheme: { ...single(1, 0), note: 'Mathematics questions carry 2 marks; set per question.' },
    markingNote: 'No negative marking in the publicly described pattern; Mathematics carries 2 marks per question. Unverified.',
    subjects: pcm(),
  },
  {
    slug: 'bitsat', category: 'jee', name: 'BITSAT', shortName: 'BITSAT', fullName: 'BITS Admission Test',
    conductingBody: 'Birla Institute of Technology and Science, Pilani', region: 'National (private university)',
    description: 'Computer-based test for BITS Pilani campuses with English Proficiency and Logical Reasoning sections.',
    onReference: true, slugObserved: true,
    markingScheme: single(3, -1), markingNote: '+3 / −1 per publicly described pattern. Unverified.',
    subjects: [...pcm(), { slug: 'english-proficiency', name: 'English Proficiency', chapters: ENGLISH_BITSAT }, { slug: 'logical-reasoning', name: 'Logical Reasoning', chapters: LOGICAL_BITSAT }],
  },
  {
    slug: 'comedk', category: 'jee', name: 'COMEDK', shortName: 'COMEDK', fullName: 'COMEDK Undergraduate Entrance Test (UGET)',
    conductingBody: 'Consortium of Medical, Engineering and Dental Colleges of Karnataka', region: 'Karnataka',
    description: 'Entrance test for private engineering colleges in Karnataka.',
    onReference: true, slugObserved: true,
    markingScheme: single(1, 0), markingNote: '+1 / 0 per publicly described pattern. Unverified.', subjects: pcm(),
  },
  {
    slug: 'wbjee', category: 'jee', name: 'WBJEE', shortName: 'WBJEE', fullName: 'West Bengal Joint Entrance Examination',
    conductingBody: 'West Bengal Joint Entrance Examinations Board', region: 'West Bengal',
    description: 'State engineering entrance for West Bengal. Uses question categories with different marking.',
    onReference: true, slugObserved: false,
    markingScheme: { ...single(1, -0.25), mcq_multi: { correct: 2, wrong: 0, partial: 'none' } },
    markingNote: 'Category-wise marking varies; Category I modelled as +1 / −¼. Unverified.', subjects: pcm(),
  },
  {
    slug: 'kcet', category: 'jee', name: 'KCET', shortName: 'KCET', fullName: 'Karnataka Common Entrance Test',
    conductingBody: 'Karnataka Examinations Authority', region: 'Karnataka',
    description: 'State common entrance test for professional courses in Karnataka (engineering stream shown).',
    onReference: true, slugObserved: false,
    markingScheme: single(1, 0), markingNote: '+1 / 0. Unverified.', subjects: pcm(),
  },
  {
    slug: 'viteee', category: 'jee', name: 'VITEEE', shortName: 'VITEEE', fullName: 'VIT Engineering Entrance Examination',
    conductingBody: 'Vellore Institute of Technology', region: 'National (private university)',
    description: 'Entrance test for VIT campuses with English and Aptitude sections.',
    onReference: true, slugObserved: true,
    markingScheme: single(1, 0), markingNote: '+1 / 0. Unverified.',
    subjects: [...pcm(), { slug: 'english', name: 'English', chapters: ENGLISH_VIT }, { slug: 'aptitude', name: 'Aptitude', chapters: APTITUDE_VIT }],
  },
  {
    slug: 'ap-eapcet', category: 'jee', name: 'AP EAPCET', shortName: 'AP EAPCET', fullName: 'Andhra Pradesh Engineering, Agriculture and Pharmacy Common Entrance Test',
    conductingBody: 'Conducted on behalf of APSCHE', region: 'Andhra Pradesh',
    description: 'State common entrance test for Andhra Pradesh (engineering stream shown).',
    onReference: true, slugObserved: false,
    markingScheme: single(1, 0), markingNote: '+1 / 0. Unverified.', subjects: pcm(),
  },
  {
    slug: 'ts-eamcet', category: 'jee', name: 'TS EAMCET', shortName: 'TS EAMCET', fullName: 'Telangana State Engineering, Agriculture & Medical Common Entrance Test (now TG EAPCET)',
    conductingBody: 'Conducted on behalf of TGCHE', region: 'Telangana',
    description: 'State common entrance test for Telangana (engineering stream shown).',
    onReference: true, slugObserved: false,
    markingScheme: single(1, 0), markingNote: '+1 / 0. Unverified.', subjects: pcm(),
  },
  {
    slug: 'keam', category: 'jee', name: 'KEAM', shortName: 'KEAM', fullName: 'Kerala Engineering Architecture Medical',
    conductingBody: 'Commissioner for Entrance Examinations, Kerala', region: 'Kerala',
    description: 'State entrance for engineering in Kerala. Original extension — not listed on the reference.',
    onReference: false, slugObserved: false,
    markingScheme: single(4, -1), markingNote: '+4 / −1. Unverified.', subjects: pcm(),
  },
  {
    slug: 'gujcet', category: 'jee', name: 'GUJCET', shortName: 'GUJCET', fullName: 'Gujarat Common Entrance Test',
    conductingBody: 'Gujarat Secondary and Higher Secondary Education Board', region: 'Gujarat',
    description: 'State entrance for engineering in Gujarat. Original extension — not listed on the reference.',
    onReference: false, slugObserved: false,
    markingScheme: single(1, -0.25), markingNote: '+1 / −¼. Unverified.', subjects: pcm(),
  },
  {
    slug: 'ojee', category: 'jee', name: 'OJEE', shortName: 'OJEE', fullName: 'Odisha Joint Entrance Examination',
    conductingBody: 'OJEE Board, Odisha', region: 'Odisha',
    description: 'State entrance for Odisha. Original extension — not listed on the reference.',
    onReference: false, slugObserved: false,
    markingScheme: single(4, -1), markingNote: '+4 / −1. Unverified.', subjects: pcm(),
  },
  {
    slug: 'neet', category: 'medical', name: 'NEET', shortName: 'NEET', fullName: 'National Eligibility cum Entrance Test (UG)',
    conductingBody: 'National Testing Agency (NTA)', region: 'National',
    description: 'National entrance for MBBS, BDS and allied undergraduate medical courses.',
    onReference: true, slugObserved: true,
    markingScheme: single(4, -1), markingNote: '+4 / −1 per publicly described pattern. Unverified.',
    subjects: [
      { slug: 'physics', name: 'Physics', chapters: strip(PHYSICS) },
      { slug: 'chemistry', name: 'Chemistry', chapters: strip(CHEMISTRY) },
      { slug: 'biology', name: 'Biology', chapters: BIOLOGY },
    ],
  },
];

export const CATEGORIES = [
  { slug: 'jee', name: 'Engineering Entrance', sort: 1 },
  { slug: 'medical', name: 'Medical Entrance', sort: 2 },
];

/** Exams listed on the reference homepage but out of scope for this build (revised brief). */
export const OUT_OF_SCOPE = [
  'IISER IAT', 'MHT CET Biology', 'AIIMS', 'GATE CSE', 'GATE ECE', 'GATE EE', 'GATE ME', 'GATE CE', 'GATE PI', 'GATE IN',
  'GATE Data Science and AI', 'UPSC Civil Services', 'NDA', 'SSC CGL Tier I', 'CBSE Class 12',
];
