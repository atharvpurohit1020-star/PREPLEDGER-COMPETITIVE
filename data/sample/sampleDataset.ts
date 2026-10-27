/**
 * PrepLedger ORIGINAL SAMPLE DATASET.
 *
 * Every question here was written for this project to exercise the platform's renderer,
 * answer, solution, practice and test workflows. None is a past-year question (is_pyq=false),
 * no answer key is labelled official, and all solutions are editorial.
 *
 * The seed script converts this module to the standard import format and loads it through
 * the same validating importer used for bulk uploads (server/lib/importer.ts).
 */
import type { ImportFile, QuestionImport } from '../../shared/importSchema';
import { EXAMS } from '../taxonomy';

const r = String.raw;
const AUTHOR = 'PrepLedger editorial (sample)';
type Q = QuestionImport;

const AR_OPTIONS = [
  'Both Assertion (A) and Reason (R) are true and R is the correct explanation of A.',
  'Both Assertion (A) and Reason (R) are true but R is not the correct explanation of A.',
  'Assertion (A) is true but Reason (R) is false.',
  'Assertion (A) is false but Reason (R) is true.',
];

interface Base {
  ref: string;
  exam: string;
  subject: string;
  chapter: string;
  body: string;
  solution: string;
  altSolution?: { label: string; body: string };
  difficulty?: 'easy' | 'medium' | 'hard';
  marks?: number;
  passage?: string;
  topics?: string[];
  answerNote?: string;
}

function common(b: Base): Omit<Q, 'type' | 'answer'> {
  const sols: Q['solutions'] = [{ kind: 'editorial', body: b.solution, is_verified: false, author_name: AUTHOR, method_label: b.altSolution ? 'Method 1' : undefined }];
  if (b.altSolution) sols.push({ kind: 'editorial', body: b.altSolution.body, is_verified: false, author_name: AUTHOR, method_label: b.altSolution.label });
  return {
    ref: b.ref,
    exam: b.exam,
    subject: b.subject,
    chapter: b.chapter,
    body: b.body,
    difficulty: b.difficulty ?? 'medium',
    marks: b.marks,
    passage: b.passage,
    topics: b.topics,
    is_pyq: false,
    status: 'published',
    verification_status: 'unverified',
    solutions: sols,
    papers: [],
  };
}

const opts = (list: string[]) => list.map((body, i) => ({ label: String.fromCharCode(65 + i), body }));
const key = (value: Q['answer']['value'], note?: string): Q['answer'] => ({ value, status: 'final', source: 'editorial', note });

function mcq(b: Base & { options: string[]; answer: string }): Q {
  return { ...common(b), type: 'mcq_single', options: opts(b.options), answer: key({ options: [b.answer] }, b.answerNote) };
}
function multi(b: Base & { options: string[]; answer: string[] }): Q {
  return { ...common(b), type: 'mcq_multi', options: opts(b.options), answer: key({ options: b.answer }, b.answerNote) };
}
function numerical(b: Base & { answer: number; tolerance?: number; range?: [number, number]; integer?: boolean }): Q {
  const value = b.range ? { range: b.range } : { numeric: b.answer, ...(b.tolerance ? { tolerance: b.tolerance } : {}) };
  return { ...common(b), type: b.integer ? 'integer' : 'numerical', answer: key(value as Q['answer']['value'], b.answerNote) };
}
function ar(b: Base & { assertion: string; reason: string; answer: string }): Q {
  const body = `${b.body ? b.body + '\n\n' : ''}**Assertion (A):** ${b.assertion}\n\n**Reason (R):** ${b.reason}`;
  return { ...common({ ...b, body }), type: 'assertion_reason', options: opts(AR_OPTIONS), answer: key({ options: [b.answer] }) };
}
function match(b: Base & { left: [string, string][]; right: [string, string][]; options: string[]; answer: string }): Q {
  return {
    ...common(b),
    type: 'matrix_match',
    matrix: { left_title: 'List-I', right_title: 'List-II', left: b.left.map(([k, body]) => ({ key: k, body })), right: b.right.map(([k, body]) => ({ key: k, body })) },
    options: opts(b.options),
    answer: key({ options: [b.answer] }),
  };
}

// ------------------------------------------------------------------ JEE Main
const jm = (s: string) => ({ exam: 'jee-main', subject: s });
const JEE_MAIN: Q[] = [
  mcq({
    ...jm('physics'), ref: 'sample.jm.p1', chapter: 'units-and-measurements', difficulty: 'easy',
    body: r`The physical quantity having the same dimensional formula as Planck's constant $h$ is`,
    options: ['linear momentum', 'angular momentum', 'energy', 'power'], answer: 'B',
    solution: r`From $E = h\nu$,
$$[h] = \frac{[E]}{[\nu]} = \frac{[ML^2T^{-2}]}{[T^{-1}]} = [ML^2T^{-1}]$$
Angular momentum $L = mvr$ has dimensions $[M][LT^{-1}][L] = [ML^2T^{-1}]$, the same as $h$.`,
  }),
  mcq({
    ...jm('physics'), ref: 'sample.jm.p2', chapter: 'motion-in-a-straight-line', difficulty: 'easy',
    body: r`A ball is thrown vertically upward with a speed of $20\ \text{m s}^{-1}$. Taking $g = 10\ \text{m s}^{-2}$ and neglecting air resistance, the maximum height reached by the ball is`,
    options: [r`$10\ \text{m}$`, r`$20\ \text{m}$`, r`$30\ \text{m}$`, r`$40\ \text{m}$`], answer: 'B',
    solution: r`At the highest point $v = 0$. Using $v^2 = u^2 - 2gh$:
$$h = \frac{u^2}{2g} = \frac{(20)^2}{2 \times 10} = 20\ \text{m}$$`,
  }),
  mcq({
    ...jm('physics'), ref: 'sample.jm.p3', chapter: 'laws-of-motion', difficulty: 'easy', topics: ['inclined-plane'],
    body: r`A block of mass $2\ \text{kg}$ is released from rest on a smooth inclined plane making an angle of $30^\circ$ with the horizontal, as shown. Taking $g = 10\ \text{m s}^{-2}$, the acceleration of the block along the incline is

![Block of mass 2 kg resting on a smooth plane inclined at 30 degrees to the horizontal](diagram:incline-30)`,
    options: [r`$2.5\ \text{m s}^{-2}$`, r`$5\ \text{m s}^{-2}$`, r`$8.66\ \text{m s}^{-2}$`, r`$10\ \text{m s}^{-2}$`], answer: 'B',
    solution: r`On a smooth incline the only force along the plane is the component of gravity, $mg\sin\theta$. Hence
$$a = g\sin 30^\circ = 10 \times \tfrac{1}{2} = 5\ \text{m s}^{-2}$$
The acceleration is independent of the mass.`,
  }),
  numerical({
    ...jm('physics'), ref: 'sample.jm.p4', chapter: 'current-electricity', answer: 2,
    body: r`In the circuit shown, resistors of $6\ \Omega$ and $3\ \Omega$ are connected in parallel, and the combination is in series with a $4\ \Omega$ resistor across an ideal $12\ \text{V}$ battery. The current (in ampere) drawn from the battery is ______.

![Circuit diagram: a 12 V battery connected to a parallel pair of 6 ohm and 3 ohm resistors followed by a 4 ohm resistor in series](diagram:circuit-6-3-4)`,
    solution: r`Parallel combination: $R_p = \dfrac{6 \times 3}{6 + 3} = 2\ \Omega$.

Total resistance: $R = 2 + 4 = 6\ \Omega$.

Current: $I = \dfrac{V}{R} = \dfrac{12}{6} = 2\ \text{A}$.`,
    altSolution: {
      label: 'Method 2: conductance',
      body: r`Conductance of the parallel pair is $\tfrac{1}{6} + \tfrac{1}{3} = \tfrac{1}{2}\ \text{S}$, so $R_p = 2\ \Omega$. With the $4\ \Omega$ resistor in series the circuit is a $1:2$ voltage divider: $4\ \text{V}$ across the pair and $8\ \text{V}$ across $4\ \Omega$, so $I = 8/4 = 2\ \text{A}$.`,
    },
  }),
  numerical({
    ...jm('physics'), ref: 'sample.jm.p5', chapter: 'geometrical-optics', answer: 60,
    body: r`An object is placed $30\ \text{cm}$ in front of a thin convex lens of focal length $20\ \text{cm}$. The distance (in cm) of the image from the lens is ______.`,
    solution: r`Using the lens formula with $u = -30\ \text{cm}$ and $f = +20\ \text{cm}$:
$$\frac{1}{v} - \frac{1}{u} = \frac{1}{f} \;\Rightarrow\; \frac{1}{v} = \frac{1}{20} - \frac{1}{30} = \frac{1}{60}$$
So $v = +60\ \text{cm}$ (real image on the other side of the lens).`,
  }),
  mcq({
    ...jm('physics'), ref: 'sample.jm.p6', chapter: 'heat-and-thermodynamics', difficulty: 'easy',
    body: r`For an ideal monoatomic gas, the ratio of specific heats $\gamma = C_p / C_v$ is`,
    options: [r`$\dfrac{7}{5}$`, r`$\dfrac{5}{3}$`, r`$\dfrac{4}{3}$`, r`$\dfrac{9}{7}$`], answer: 'B',
    solution: r`A monoatomic gas has 3 translational degrees of freedom, so $C_v = \tfrac{3}{2}R$ and $C_p = C_v + R = \tfrac{5}{2}R$. Therefore $\gamma = \dfrac{5/2}{3/2} = \dfrac{5}{3}$.`,
  }),
  numerical({
    ...jm('chemistry'), ref: 'sample.jm.c1', chapter: 'some-basic-concepts-of-chemistry', answer: 0.25, difficulty: 'easy',
    body: r`The number of moles of carbon dioxide present in $11\ \text{g}$ of $\ce{CO2}$ is ______. (Molar mass of $\ce{CO2}$ = $44\ \text{g mol}^{-1}$)`,
    solution: r`$n = \dfrac{m}{M} = \dfrac{11}{44} = 0.25\ \text{mol}$.`,
  }),
  mcq({
    ...jm('chemistry'), ref: 'sample.jm.c2', chapter: 'chemical-bonding-and-molecular-structure',
    body: r`The hybridisation of the central sulphur atom in $\ce{SF6}$ is`,
    options: [r`$sp^3$`, r`$sp^3d$`, r`$sp^3d^2$`, r`$dsp^2$`], answer: 'C',
    solution: r`Sulphur forms six $\sigma$ bonds with fluorine and has no lone pair, giving six electron domains around S. Six domains correspond to $sp^3d^2$ hybridisation and an octahedral geometry.`,
  }),
  mcq({
    ...jm('chemistry'), ref: 'sample.jm.c3', chapter: 'electrochemistry',
    body: r`For the cell reaction
$$\ce{Zn(s) + Cu^2+(aq) -> Zn^2+(aq) + Cu(s)}$$
the standard electrode potentials are $E^\circ_{\ce{Zn^2+/Zn}} = -0.76\ \text{V}$ and $E^\circ_{\ce{Cu^2+/Cu}} = +0.34\ \text{V}$. The standard emf of the cell is`,
    options: [r`$0.42\ \text{V}$`, r`$1.10\ \text{V}$`, r`$-1.10\ \text{V}$`, r`$0.76\ \text{V}$`], answer: 'B',
    solution: r`Zinc is oxidised (anode) and copper ions are reduced (cathode):
$$E^\circ_{\text{cell}} = E^\circ_{\text{cathode}} - E^\circ_{\text{anode}} = 0.34 - (-0.76) = 1.10\ \text{V}$$`,
  }),
  numerical({
    ...jm('chemistry'), ref: 'sample.jm.c4', chapter: 'solutions', answer: 0.2,
    body: r`$4\ \text{g}$ of $\ce{NaOH}$ is dissolved in $500\ \text{g}$ of water. The molality of the solution (in $\text{mol kg}^{-1}$) is ______. (Molar mass of $\ce{NaOH}$ = $40\ \text{g mol}^{-1}$)`,
    solution: r`Moles of solute $= 4/40 = 0.1\ \text{mol}$; mass of solvent $= 0.5\ \text{kg}$.
$$m = \frac{0.1}{0.5} = 0.2\ \text{mol kg}^{-1}$$`,
  }),
  mcq({
    ...jm('chemistry'), ref: 'sample.jm.c5', chapter: 'hydrocarbons',
    body: r`The major product of the reaction of propene with $\ce{HBr}$ in the absence of peroxide is
$$\ce{CH3-CH=CH2 + HBr -> ?}$$`,
    options: ['1-bromopropane', '2-bromopropane', '1,2-dibromopropane', 'propane'], answer: 'B',
    solution: r`In the absence of peroxide, addition follows Markovnikov's rule: $\ce{H+}$ adds to the terminal carbon to give the more stable secondary carbocation $\ce{CH3-\overset{+}{C}H-CH3}$, which is captured by $\ce{Br-}$ to give 2-bromopropane.`,
  }),
  {
    ...mcq({
      ...jm('chemistry'), ref: 'sample.jm.c6', chapter: 'coordination-compounds', difficulty: 'easy',
      body: r`The oxidation state of iron in $\ce{K4[Fe(CN)6]}$ is`,
      options: ['+2', '+3', '+4', '0'], answer: 'A',
      solution: r`Let the oxidation state of Fe be $x$. Each $\ce{K}$ is $+1$ and each $\ce{CN-}$ is $-1$:
$$4(+1) + x + 6(-1) = 0 \;\Rightarrow\; x = +2$$`,
    }),
    answer: { value: { options: ['A'] }, status: 'revised', source: 'editorial', note: 'Sample record illustrating correction history: the editorial key was corrected from C to A after review.', effective_at: '2026-01-15' },
    answer_history: [{ value: { options: ['C'] }, status: 'final', source: 'editorial', note: 'Initial editorial key (incorrect).', effective_at: '2026-01-10' }],
  },
  mcq({
    ...jm('mathematics'), ref: 'sample.jm.m1', chapter: 'quadratic-equation-and-inequalities', difficulty: 'easy',
    body: r`If $\alpha$ and $\beta$ are the roots of $x^2 - 5x + 6 = 0$, then $\alpha^2 + \beta^2$ equals`,
    options: ['11', '13', '25', '36'], answer: 'B',
    solution: r`$\alpha + \beta = 5$ and $\alpha\beta = 6$, so
$$\alpha^2 + \beta^2 = (\alpha+\beta)^2 - 2\alpha\beta = 25 - 12 = 13$$`,
  }),
  mcq({
    ...jm('mathematics'), ref: 'sample.jm.m2', chapter: 'complex-numbers',
    body: r`The value of $(1 + i)^8$, where $i = \sqrt{-1}$, is`,
    options: ['4', '8', '16', '256'], answer: 'C',
    solution: r`$(1+i)^2 = 1 + 2i + i^2 = 2i$. Hence $(1+i)^8 = (2i)^4 = 16\, i^4 = 16$.`,
  }),
  numerical({
    ...jm('mathematics'), ref: 'sample.jm.m3', chapter: 'matrices-and-determinants', answer: 5, difficulty: 'easy',
    body: r`The value of the determinant
$$\begin{vmatrix} 1 & 2 & 3 \\ 0 & 1 & 4 \\ 0 & 0 & 5 \end{vmatrix}$$
is ______.`,
    solution: r`The matrix is upper triangular, so its determinant is the product of the diagonal entries: $1 \times 1 \times 5 = 5$.`,
  }),
  numerical({
    ...jm('mathematics'), ref: 'sample.jm.m4', chapter: 'definite-integration', answer: 2, difficulty: 'easy',
    body: r`The value of $\displaystyle\int_0^1 \left(3x^2 + 2x\right)\,dx$ is ______.`,
    solution: r`$$\int_0^1 (3x^2 + 2x)\,dx = \Big[x^3 + x^2\Big]_0^1 = 1 + 1 = 2$$`,
    altSolution: { label: 'Method 2: geometric reading', body: r`$\int_0^1 3x^2\,dx = 1$ (area under $3x^2$) and $\int_0^1 2x\,dx = 1$ (a right triangle with base 1 and height 2). The sum is $2$.` },
  }),
  mcq({
    ...jm('mathematics'), ref: 'sample.jm.m5', chapter: 'probability', difficulty: 'easy',
    body: r`Two fair dice are thrown together. The probability that the sum of the numbers shown is $7$ is`,
    options: [r`$\dfrac{1}{12}$`, r`$\dfrac{1}{6}$`, r`$\dfrac{5}{36}$`, r`$\dfrac{7}{36}$`], answer: 'B',
    solution: r`Favourable outcomes: $(1,6),(2,5),(3,4),(4,3),(5,2),(6,1)$ — six of the $36$ equally likely outcomes. $P = 6/36 = 1/6$.`,
  }),
  mcq({
    ...jm('mathematics'), ref: 'sample.jm.m6', chapter: 'vector-algebra',
    body: r`The angle between the vectors $\vec{a} = \hat{i} + 2\hat{j} + 2\hat{k}$ and $\vec{b} = 2\hat{i} - \hat{j}$ is`,
    options: [r`$0^\circ$`, r`$45^\circ$`, r`$60^\circ$`, r`$90^\circ$`], answer: 'D',
    solution: r`$\vec{a}\cdot\vec{b} = (1)(2) + (2)(-1) + (2)(0) = 0$. A zero dot product between non-zero vectors means they are perpendicular, so the angle is $90^\circ$.`,
  }),
];

// ------------------------------------------------------------------ JEE Advanced
const ja = (s: string) => ({ exam: 'jee-advanced', subject: s });
const KINETICS_PASSAGE = 'sample.ja.passage.kinetics';
const JEE_ADV: Q[] = [
  mcq({
    ...ja('physics'), ref: 'sample.ja.p1', chapter: 'rotational-motion',
    body: r`The moment of inertia of a uniform solid sphere of mass $M$ and radius $R$ about an axis tangent to its surface is`,
    options: [r`$\tfrac{2}{5}MR^2$`, r`$\tfrac{7}{5}MR^2$`, r`$\tfrac{2}{3}MR^2$`, r`$\tfrac{5}{3}MR^2$`], answer: 'B',
    solution: r`About a diameter $I_{cm} = \tfrac{2}{5}MR^2$. By the parallel-axis theorem with $d = R$:
$$I = \tfrac{2}{5}MR^2 + MR^2 = \tfrac{7}{5}MR^2$$`,
  }),
  multi({
    ...ja('physics'), ref: 'sample.ja.p2', chapter: 'electrostatics', difficulty: 'medium',
    body: r`An isolated conducting sphere of radius $R$ carries a charge $Q$. Taking $k = \dfrac{1}{4\pi\varepsilon_0}$ and the potential at infinity as zero, which of the following statements is/are correct?`,
    options: [
      'The electric field everywhere inside the sphere is zero.',
      r`The potential everywhere inside the sphere is $\dfrac{kQ}{R}$.`,
      r`The magnitude of the electric field just outside the surface is $\dfrac{kQ}{R^2}$.`,
      'The potential at the centre of the sphere is zero.',
    ],
    answer: ['A', 'B', 'C'],
    solution: r`Charge resides on the surface of a conductor, so $E = 0$ inside (A correct). Since $E = -dV/dr = 0$, the potential inside equals its surface value $kQ/R$ (B correct; D wrong). Just outside, the sphere acts like a point charge: $E = kQ/R^2$ (C correct).`,
  }),
  numerical({
    ...ja('physics'), ref: 'sample.ja.p3', chapter: 'simple-harmonic-motion', answer: 0.63, range: [0.62, 0.64],
    body: r`A block of mass $1\ \text{kg}$ attached to a light spring of force constant $100\ \text{N m}^{-1}$ oscillates on a smooth horizontal surface. The time period of oscillation, in seconds, correct to two decimal places, is ______.`,
    solution: r`$$T = 2\pi\sqrt{\frac{m}{k}} = 2\pi\sqrt{\frac{1}{100}} = \frac{2\pi}{10} \approx 0.628\ \text{s} \approx 0.63\ \text{s}$$
Answers in the range $0.62$–$0.64$ are accepted to allow for rounding of $\pi$.`,
  }),
  match({
    ...ja('physics'), ref: 'sample.ja.p4', chapter: 'units-and-measurements',
    body: 'Match each physical quantity in List-I with its dimensional formula in List-II and choose the correct option.',
    left: [['P', 'Force'], ['Q', 'Pressure'], ['R', 'Work'], ['S', 'Impulse']],
    right: [['1', r`$[ML^{-1}T^{-2}]$`], ['2', r`$[MLT^{-1}]$`], ['3', r`$[MLT^{-2}]$`], ['4', r`$[ML^{2}T^{-2}]$`]],
    options: [r`P $\to$ 3; Q $\to$ 1; R $\to$ 4; S $\to$ 2`, r`P $\to$ 2; Q $\to$ 1; R $\to$ 4; S $\to$ 3`, r`P $\to$ 3; Q $\to$ 4; R $\to$ 1; S $\to$ 2`, r`P $\to$ 1; Q $\to$ 3; R $\to$ 2; S $\to$ 4`],
    answer: 'A',
    solution: r`- Force $= ma \Rightarrow [MLT^{-2}]$ (3)
- Pressure $= F/A \Rightarrow [ML^{-1}T^{-2}]$ (1)
- Work $= F\cdot d \Rightarrow [ML^2T^{-2}]$ (4)
- Impulse $= F\,\Delta t \Rightarrow [MLT^{-1}]$ (2)`,
  }),
  numerical({
    ...ja('chemistry'), ref: 'sample.ja.c1', chapter: 'chemical-kinetics', passage: KINETICS_PASSAGE, answer: 10, integer: true,
    body: r`The half-life of the reaction, in minutes, is ______.`,
    solution: r`For a first-order reaction $t_{1/2} = \dfrac{0.693}{k} = \dfrac{0.693}{0.0693} = 10\ \text{min}$.`,
  }),
  numerical({
    ...ja('chemistry'), ref: 'sample.ja.c2', chapter: 'chemical-kinetics', passage: KINETICS_PASSAGE, answer: 20, integer: true,
    body: r`The time, in minutes, required for $75\%$ of the reactant to be consumed is ______.`,
    solution: r`$75\%$ completion leaves $25\% = (1/2)^2$ of the reactant, i.e. two half-lives: $2 \times 10 = 20\ \text{min}$.`,
  }),
  numerical({
    ...ja('chemistry'), ref: 'sample.ja.c3', chapter: 'ionic-equilibrium', answer: 3, integer: true, difficulty: 'easy',
    body: r`The pH of a $1.0 \times 10^{-3}\ \text{M}$ aqueous solution of $\ce{HCl}$ at $25^\circ\text{C}$ is ______.`,
    solution: r`$\ce{HCl}$ is a strong acid, so $[\ce{H+}] = 10^{-3}\ \text{M}$ (water's contribution is negligible). $\text{pH} = -\log_{10}(10^{-3}) = 3$.`,
  }),
  multi({
    ...ja('chemistry'), ref: 'sample.ja.c4', chapter: 'aldehydes-ketones-and-carboxylic-acids',
    body: r`Which of the following give(s) a positive Tollens' test (silver mirror)?`,
    options: [r`$\ce{HCHO}$`, r`$\ce{CH3CHO}$`, r`$\ce{CH3COCH3}$`, r`$\ce{HCOOH}$`],
    answer: ['A', 'B', 'D'],
    solution: r`Aldehydes reduce Tollens' reagent, so formaldehyde (A) and acetaldehyde (B) give a silver mirror. Formic acid (D) contains an aldehyde-like $\ce{H-C(=O)-}$ group and is also oxidised. Acetone (C), a ketone, does not respond.`,
  }),
  multi({
    ...ja('mathematics'), ref: 'sample.ja.m1', chapter: 'limits-continuity-and-differentiability',
    body: r`Let $f:\mathbb{R}\to\mathbb{R}$ be defined by $f(x) = |x|$. Which of the following statements is/are TRUE?`,
    options: [r`$f$ is continuous at $x = 0$`, r`$f$ is differentiable at $x = 0$`, r`$f$ attains its minimum value at $x = 0$`, r`$f$ is an odd function`],
    answer: ['A', 'C'],
    solution: r`$\lim_{x\to0}|x| = 0 = f(0)$, so $f$ is continuous at $0$ (A). The left derivative is $-1$ and the right derivative is $+1$, so $f$ is not differentiable at $0$ (B false). $|x| \ge 0 = f(0)$, so the minimum is at $0$ (C). $f(-x) = f(x)$, so $f$ is even, not odd (D false).`,
  }),
  numerical({
    ...ja('mathematics'), ref: 'sample.ja.m2', chapter: 'sequences-and-series', answer: 10, integer: true,
    body: r`The sum of the first $n$ terms of the arithmetic progression $2, 5, 8, \ldots$ is $155$. The value of $n$ is ______.`,
    solution: r`$S_n = \dfrac{n}{2}\big[2(2) + (n-1)3\big] = \dfrac{n(3n+1)}{2} = 155$, so $3n^2 + n - 310 = 0$.
$$n = \frac{-1 + \sqrt{1 + 3720}}{6} = \frac{-1 + 61}{6} = 10$$`,
  }),
  numerical({
    ...ja('mathematics'), ref: 'sample.ja.m3', chapter: 'probability', answer: 0.88, range: [0.87, 0.88],
    body: r`A fair coin is tossed three times. The probability of getting at least one head, correct to two decimal places, is ______.`,
    solution: r`$P(\text{no head}) = (1/2)^3 = 1/8$, so $P(\text{at least one head}) = 1 - 1/8 = 7/8 = 0.875$. Both $0.87$ and $0.88$ are accepted as two-decimal roundings.`,
  }),
];

// ------------------------------------------------------------------ NEET
const nt = (s: string) => ({ exam: 'neet', subject: s });
const NEET: Q[] = [
  mcq({
    ...nt('physics'), ref: 'sample.neet.p1', chapter: 'work-power-and-energy', difficulty: 'easy',
    body: r`The kinetic energy of a body of mass $2\ \text{kg}$ moving with a speed of $3\ \text{m s}^{-1}$ is`,
    options: [r`$3\ \text{J}$`, r`$6\ \text{J}$`, r`$9\ \text{J}$`, r`$18\ \text{J}$`], answer: 'C',
    solution: r`$K = \tfrac{1}{2}mv^2 = \tfrac{1}{2}(2)(3)^2 = 9\ \text{J}$.`,
  }),
  ar({
    ...nt('physics'), ref: 'sample.neet.p2', chapter: 'gravitation', body: '', answer: 'A',
    assertion: 'The acceleration due to gravity decreases as we move upward from the surface of the Earth.',
    reason: r`Outside the Earth, $g = \dfrac{GM}{r^2}$, which decreases as the distance $r$ from the centre increases.`,
    solution: r`Both statements are true, and the inverse-square dependence of $g$ on $r$ (R) is exactly why $g$ falls with altitude (A). Hence option A.`,
  }),
  mcq({
    ...nt('physics'), ref: 'sample.neet.p3', chapter: 'dual-nature-of-radiation',
    body: r`The energy of a photon of wavelength $620\ \text{nm}$ is approximately (take $hc = 1240\ \text{eV nm}$)`,
    options: [r`$1\ \text{eV}$`, r`$2\ \text{eV}$`, r`$3\ \text{eV}$`, r`$4\ \text{eV}$`], answer: 'B',
    solution: r`$E = \dfrac{hc}{\lambda} = \dfrac{1240\ \text{eV nm}}{620\ \text{nm}} = 2\ \text{eV}$.`,
  }),
  mcq({
    ...nt('chemistry'), ref: 'sample.neet.c1', chapter: 'structure-of-atom', difficulty: 'easy',
    body: r`The total number of orbitals in the shell with principal quantum number $n = 3$ is`,
    options: ['3', '6', '9', '18'], answer: 'C',
    solution: r`The number of orbitals in a shell is $n^2 = 3^2 = 9$ (one $3s$, three $3p$ and five $3d$).`,
  }),
  mcq({
    ...nt('chemistry'), ref: 'sample.neet.c2', chapter: 'chemical-equilibrium',
    body: r`For the equilibrium
$$\ce{N2(g) + 3H2(g) <=> 2NH3(g)}$$
$K_p$ and $K_c$ are related by $K_p = K_c(RT)^{\Delta n}$. The value of $\Delta n$ is`,
    options: ['−2', '2', '0', '−1'], answer: 'A',
    solution: r`$\Delta n = n_{\text{gaseous products}} - n_{\text{gaseous reactants}} = 2 - (1 + 3) = -2$.`,
  }),
  match({
    ...nt('chemistry'), ref: 'sample.neet.c3', chapter: 'chemical-bonding-and-molecular-structure',
    body: 'Match the molecules in List-I with their shapes in List-II.',
    left: [['P', r`$\ce{XeF4}$`], ['Q', r`$\ce{SF4}$`], ['R', r`$\ce{ClF3}$`], ['S', r`$\ce{XeF2}$`]],
    right: [['1', 'Linear'], ['2', 'T-shaped'], ['3', 'See-saw'], ['4', 'Square planar']],
    options: ['P-4, Q-3, R-2, S-1', 'P-3, Q-4, R-1, S-2', 'P-4, Q-2, R-3, S-1', 'P-1, Q-3, R-2, S-4'],
    answer: 'A',
    solution: r`| Molecule | Bond pairs | Lone pairs | Shape |
|---|---|---|---|
| $\ce{XeF4}$ | 4 | 2 | Square planar |
| $\ce{SF4}$ | 4 | 1 | See-saw |
| $\ce{ClF3}$ | 3 | 2 | T-shaped |
| $\ce{XeF2}$ | 2 | 3 | Linear |`,
  }),
  mcq({
    ...nt('biology'), ref: 'sample.neet.b1', chapter: 'cell-the-unit-of-life', difficulty: 'easy',
    body: 'Which cell component is the site of protein synthesis?',
    options: ['Lysosome', 'Ribosome', 'Golgi apparatus', 'Centriole'], answer: 'B',
    solution: 'Ribosomes translate messenger RNA into polypeptide chains, so they are the site of protein synthesis. Lysosomes digest material, the Golgi apparatus packages proteins, and centrioles organise the spindle.',
  }),
  ar({
    ...nt('biology'), ref: 'sample.neet.b2', chapter: 'cell-the-unit-of-life', body: '', answer: 'B',
    assertion: 'Mitochondria are called the powerhouses of the cell.',
    reason: 'Mitochondria contain their own circular DNA.',
    solution: 'Both statements are true. Mitochondria are called powerhouses because aerobic respiration in them produces most of the cell\'s ATP; possessing their own DNA does not explain this role. Hence option B.',
  }),
  mcq({
    ...nt('biology'), ref: 'sample.neet.b3', chapter: 'molecular-basis-of-inheritance',
    body: 'In a double-stranded DNA molecule, adenine makes up 20% of the bases. The percentage of guanine is',
    options: ['20%', '30%', '40%', '60%'], answer: 'B',
    solution: r`By Chargaff's rule $A = T = 20\%$, so $G + C = 60\%$ and, since $G = C$, $G = 30\%$.`,
  }),
  mcq({
    ...nt('biology'), ref: 'sample.neet.b4', chapter: 'human-health-and-diseases', difficulty: 'easy',
    body: 'The vector that transmits the malarial parasite to humans is',
    options: ['female *Anopheles* mosquito', 'female *Culex* mosquito', 'female *Aedes* mosquito', 'housefly'], answer: 'A',
    solution: '*Plasmodium* is transmitted to humans through the bite of an infected female *Anopheles* mosquito.',
  }),
  mcq({
    ...nt('biology'), ref: 'sample.neet.b5', chapter: 'photosynthesis-in-higher-plants',
    body: r`In $\ce{C4}$ plants, the primary acceptor of $\ce{CO2}$ in mesophyll cells is`,
    options: ['phosphoenolpyruvate (PEP)', 'ribulose-1,5-bisphosphate (RuBP)', 'oxaloacetic acid (OAA)', '3-phosphoglyceric acid (PGA)'], answer: 'A',
    solution: r`In the Hatch–Slack pathway, PEP in mesophyll cells fixes $\ce{CO2}$ (via PEP carboxylase) to form the 4-carbon OAA. RuBP is the acceptor in the Calvin cycle, which occurs in bundle-sheath cells.`,
  }),
  mcq({
    ...nt('biology'), ref: 'sample.neet.b6', chapter: 'ecosystem',
    body: r`The pyramid of energy below has four trophic levels. If the producers fix $10{,}000\ \text{J}$ and the 10 per cent law applies, the energy available at the fourth trophic level ($T_4$) is

![Pyramid of energy with producers at the base holding 10,000 joules, followed by primary consumers, secondary consumers and a fourth trophic level at the apex](diagram:energy-pyramid)

| Trophic level | Energy |
|---|---|
| $T_1$ (producers) | $10{,}000\ \text{J}$ |
| $T_2$ | ? |
| $T_3$ | ? |
| $T_4$ | ? |`,
    options: [r`$1000\ \text{J}$`, r`$100\ \text{J}$`, r`$10\ \text{J}$`, r`$1\ \text{J}$`], answer: 'C',
    solution: r`Only about 10% passes to each higher level: $10{,}000 \to 1000 \to 100 \to 10\ \text{J}$ at $T_4$.`,
  }),
];

// ------------------------------------------------------------------ Other engineering entrances
const ex = (exam: string, subject: string) => ({ exam, subject });
const STATE: Q[] = [
  // MHT CET
  mcq({
    ...ex('mht-cet', 'physics'), ref: 'sample.mht.p1', chapter: 'magnetic-effects-of-current',
    body: r`The magnitude of the magnetic field at the centre of a circular loop of radius $r$ carrying a steady current $I$ is`,
    options: [r`$\dfrac{\mu_0 I}{2\pi r}$`, r`$\dfrac{\mu_0 I}{2r}$`, r`$\dfrac{\mu_0 I}{4r}$`, r`$\dfrac{\mu_0 I r}{2}$`], answer: 'B',
    solution: r`From the Biot–Savart law, every element of the loop is at distance $r$ and perpendicular to the radius, giving $B = \dfrac{\mu_0 I}{4\pi r^2}(2\pi r) = \dfrac{\mu_0 I}{2r}$.`,
  }),
  mcq({
    ...ex('mht-cet', 'chemistry'), ref: 'sample.mht.c1', chapter: 'some-basic-concepts-of-chemistry', difficulty: 'easy',
    body: r`The molar mass of $\ce{H2SO4}$ is (H = 1, S = 32, O = 16)`,
    options: [r`$49\ \text{g mol}^{-1}$`, r`$96\ \text{g mol}^{-1}$`, r`$98\ \text{g mol}^{-1}$`, r`$100\ \text{g mol}^{-1}$`], answer: 'C',
    solution: r`$2(1) + 32 + 4(16) = 98\ \text{g mol}^{-1}$.`,
  }),
  mcq({
    ...ex('mht-cet', 'mathematics'), ref: 'sample.mht.m1', chapter: 'trigonometric-ratios-and-identities', marks: 2,
    body: r`The value of $\sin 30^\circ \cos 60^\circ + \cos 30^\circ \sin 60^\circ$ is`,
    options: ['0', r`$\tfrac{1}{2}$`, '1', r`$\tfrac{\sqrt{3}}{2}$`], answer: 'C',
    solution: r`This is $\sin(30^\circ + 60^\circ) = \sin 90^\circ = 1$.`,
  }),
  // BITSAT
  mcq({
    ...ex('bitsat', 'physics'), ref: 'sample.bitsat.p1', chapter: 'gravitation',
    body: r`The escape speed of a body from the surface of a planet depends on`,
    options: ['the mass of the body only', 'the mass and radius of the planet', 'the direction of projection', 'the mass of the body and the radius of the planet'], answer: 'B',
    solution: r`$v_e = \sqrt{\dfrac{2GM}{R}}$ depends on the planet's mass $M$ and radius $R$, not on the body's mass or the direction of projection.`,
  }),
  mcq({
    ...ex('bitsat', 'chemistry'), ref: 'sample.bitsat.c1', chapter: 'periodic-table-and-periodicity', difficulty: 'easy',
    body: 'Which element has the highest electronegativity on the Pauling scale?',
    options: ['Oxygen', 'Chlorine', 'Fluorine', 'Nitrogen'], answer: 'C',
    solution: 'Fluorine has the highest Pauling electronegativity (about 4.0) because of its small size and high effective nuclear charge.',
  }),
  mcq({
    ...ex('bitsat', 'mathematics'), ref: 'sample.bitsat.m1', chapter: 'binomial-theorem',
    body: r`The coefficient of $x^2$ in the expansion of $(1 + x)^5$ is`,
    options: ['5', '10', '15', '20'], answer: 'B',
    solution: r`The general term is $\binom{5}{r}x^r$; for $r = 2$, $\binom{5}{2} = 10$.`,
  }),
  mcq({
    ...ex('bitsat', 'english-proficiency'), ref: 'sample.bitsat.e1', chapter: 'vocabulary', difficulty: 'easy',
    body: 'Choose the word closest in meaning to **ABUNDANT**.',
    options: ['Scarce', 'Plentiful', 'Hidden', 'Fragile'], answer: 'B',
    solution: '*Abundant* means existing in large quantities — *plentiful*. *Scarce* is its antonym.',
  }),
  mcq({
    ...ex('bitsat', 'logical-reasoning'), ref: 'sample.bitsat.l1', chapter: 'verbal-reasoning',
    body: 'Find the next number in the series: 2, 6, 12, 20, 30, ?',
    options: ['36', '40', '42', '48'], answer: 'C',
    solution: r`The terms are $n(n+1)$ for $n = 1, 2, \ldots$: $1\cdot2, 2\cdot3, 3\cdot4, 4\cdot5, 5\cdot6$. The next is $6 \cdot 7 = 42$ (differences $4, 6, 8, 10, 12$).`,
  }),
  // COMEDK
  mcq({
    ...ex('comedk', 'physics'), ref: 'sample.comedk.p1', chapter: 'electromagnetic-induction',
    body: r`The magnetic flux through a coil decreases uniformly from $0.5\ \text{Wb}$ to $0.1\ \text{Wb}$ in $0.2\ \text{s}$. The magnitude of the induced emf is`,
    options: [r`$0.4\ \text{V}$`, r`$0.8\ \text{V}$`, r`$2\ \text{V}$`, r`$3\ \text{V}$`], answer: 'C',
    solution: r`$|\varepsilon| = \left|\dfrac{\Delta\Phi}{\Delta t}\right| = \dfrac{0.5 - 0.1}{0.2} = 2\ \text{V}$.`,
  }),
  mcq({
    ...ex('comedk', 'chemistry'), ref: 'sample.comedk.c1', chapter: 'thermodynamics',
    body: r`A process at constant temperature and pressure is spontaneous when`,
    options: [r`$\Delta G > 0$`, r`$\Delta G < 0$`, r`$\Delta H > 0$ always`, r`$\Delta S < 0$ always`], answer: 'B',
    solution: r`At constant $T$ and $p$, the criterion for spontaneity is a decrease in Gibbs energy: $\Delta G = \Delta H - T\Delta S < 0$.`,
  }),
  mcq({
    ...ex('comedk', 'mathematics'), ref: 'sample.comedk.m1', chapter: 'limits-continuity-and-differentiability', difficulty: 'easy',
    body: r`$\displaystyle\lim_{x \to 0} \frac{\sin 3x}{x}$ equals`,
    options: ['0', '1', '3', r`$\tfrac{1}{3}$`], answer: 'C',
    solution: r`$\dfrac{\sin 3x}{x} = 3\cdot\dfrac{\sin 3x}{3x} \to 3 \cdot 1 = 3$.`,
  }),
  // WBJEE
  mcq({
    ...ex('wbjee', 'physics'), ref: 'sample.wbjee.p1', chapter: 'wave-optics',
    body: r`In Young's double-slit experiment, the wavelength of light is $600\ \text{nm}$, the slit separation is $1\ \text{mm}$ and the screen is $1\ \text{m}$ away. The fringe width is`,
    options: [r`$0.06\ \text{mm}$`, r`$0.6\ \text{mm}$`, r`$6\ \text{mm}$`, r`$0.3\ \text{mm}$`], answer: 'B',
    solution: r`$\beta = \dfrac{\lambda D}{d} = \dfrac{600\times10^{-9} \times 1}{1\times10^{-3}} = 6\times10^{-4}\ \text{m} = 0.6\ \text{mm}$.`,
  }),
  mcq({
    ...ex('wbjee', 'chemistry'), ref: 'sample.wbjee.c1', chapter: 'isomerism', difficulty: 'easy',
    body: r`The number of structural isomers of $\ce{C4H10}$ is`,
    options: ['1', '2', '3', '4'], answer: 'B',
    solution: 'n-Butane and isobutane (2-methylpropane): two structural isomers.',
  }),
  mcq({
    ...ex('wbjee', 'mathematics'), ref: 'sample.wbjee.m1', chapter: 'circle',
    body: r`The radius of the circle $x^2 + y^2 - 4x - 6y - 12 = 0$ is`,
    options: ['3', '4', '5', '6'], answer: 'C',
    solution: r`Centre $(2, 3)$; $r = \sqrt{2^2 + 3^2 + 12} = \sqrt{25} = 5$.`,
  }),
  // KCET
  mcq({
    ...ex('kcet', 'physics'), ref: 'sample.kcet.p1', chapter: 'alternating-current', difficulty: 'easy',
    body: r`The peak value of a sinusoidal alternating voltage is $10\sqrt{2}\ \text{V}$. Its rms value is`,
    options: [r`$5\ \text{V}$`, r`$10\ \text{V}$`, r`$10\sqrt{2}\ \text{V}$`, r`$20\ \text{V}$`], answer: 'B',
    solution: r`$V_{\text{rms}} = \dfrac{V_0}{\sqrt{2}} = \dfrac{10\sqrt{2}}{\sqrt{2}} = 10\ \text{V}$.`,
  }),
  mcq({
    ...ex('kcet', 'chemistry'), ref: 'sample.kcet.c1', chapter: 'biomolecules', difficulty: 'easy',
    body: 'Glucose is classified as',
    options: ['an aldopentose', 'an aldohexose', 'a ketohexose', 'a ketopentose'], answer: 'B',
    solution: r`Glucose, $\ce{C6H12O6}$, has six carbon atoms and an aldehyde group: an aldohexose. Fructose is a ketohexose.`,
  }),
  mcq({
    ...ex('kcet', 'mathematics'), ref: 'sample.kcet.m1', chapter: 'sets-and-relations', difficulty: 'easy',
    body: r`If $n(A) = 20$, $n(B) = 15$ and $n(A \cap B) = 5$, then $n(A \cup B)$ is`,
    options: ['25', '30', '35', '40'], answer: 'B',
    solution: r`$n(A\cup B) = n(A) + n(B) - n(A\cap B) = 20 + 15 - 5 = 30$.`,
  }),
  // VITEEE
  mcq({
    ...ex('viteee', 'physics'), ref: 'sample.viteee.p1', chapter: 'electronic-devices',
    body: 'When a p-n junction diode is forward biased, the width of its depletion region',
    options: ['increases', 'decreases', 'remains unchanged', 'first increases then decreases'], answer: 'B',
    solution: 'Forward bias opposes the built-in potential, pushing majority carriers towards the junction and narrowing the depletion region.',
  }),
  mcq({
    ...ex('viteee', 'chemistry'), ref: 'sample.viteee.c1', chapter: 'd-and-f-block-elements',
    body: r`The oxidation state of manganese in $\ce{KMnO4}$ is`,
    options: ['+4', '+5', '+6', '+7'], answer: 'D',
    solution: r`$+1 + x + 4(-2) = 0 \Rightarrow x = +7$.`,
  }),
  mcq({
    ...ex('viteee', 'mathematics'), ref: 'sample.viteee.m1', chapter: 'straight-lines-and-pair-of-straight-lines', difficulty: 'easy',
    body: r`The slope of the line passing through the points $(1, 2)$ and $(3, 8)$ is`,
    options: ['2', '3', '4', '6'], answer: 'B',
    solution: r`$m = \dfrac{8 - 2}{3 - 1} = 3$.`,
  }),
  mcq({
    ...ex('viteee', 'english'), ref: 'sample.viteee.e1', chapter: 'grammar', difficulty: 'easy',
    body: 'Choose the correct word to fill in the blank: "Neither of the two boys ______ present yesterday."',
    options: ['were', 'was', 'are', 'have been'], answer: 'B',
    solution: '*Neither* is singular and the sentence is in the past tense, so the verb is *was*.',
  }),
  mcq({
    ...ex('viteee', 'aptitude'), ref: 'sample.viteee.a1', chapter: 'quantitative-aptitude', difficulty: 'easy',
    body: r`What is $20\%$ of $250$?`,
    options: ['25', '40', '50', '60'], answer: 'C',
    solution: r`$0.2 \times 250 = 50$.`,
  }),
  // AP EAPCET
  mcq({
    ...ex('ap-eapcet', 'physics'), ref: 'sample.ap.p1', chapter: 'center-of-mass-and-collision',
    body: r`Particles of mass $1\ \text{kg}$ and $3\ \text{kg}$ are placed at $x = 0$ and $x = 4\ \text{m}$ respectively. The position of their centre of mass is`,
    options: [r`$x = 1\ \text{m}$`, r`$x = 2\ \text{m}$`, r`$x = 3\ \text{m}$`, r`$x = 4\ \text{m}$`], answer: 'C',
    solution: r`$x_{cm} = \dfrac{1(0) + 3(4)}{1 + 3} = 3\ \text{m}$.`,
  }),
  mcq({
    ...ex('ap-eapcet', 'chemistry'), ref: 'sample.ap.c1', chapter: 'redox-reactions',
    body: r`The oxidation state of chromium in $\ce{K2Cr2O7}$ is`,
    options: ['+3', '+4', '+6', '+7'], answer: 'C',
    solution: r`$2(+1) + 2x + 7(-2) = 0 \Rightarrow 2x = 12 \Rightarrow x = +6$.`,
  }),
  mcq({
    ...ex('ap-eapcet', 'mathematics'), ref: 'sample.ap.m1', chapter: 'permutations-and-combinations',
    body: 'The number of distinct arrangements of the letters of the word LEVEL is',
    options: ['20', '30', '60', '120'], answer: 'B',
    solution: r`LEVEL has 5 letters with L and E each repeated twice: $\dfrac{5!}{2!\,2!} = \dfrac{120}{4} = 30$.`,
  }),
  // TS EAMCET
  mcq({
    ...ex('ts-eamcet', 'physics'), ref: 'sample.ts.p1', chapter: 'fluid-mechanics',
    body: r`The gauge pressure at a depth of $10\ \text{m}$ in water (density $1000\ \text{kg m}^{-3}$, $g = 10\ \text{m s}^{-2}$) is`,
    options: [r`$10^3\ \text{Pa}$`, r`$10^4\ \text{Pa}$`, r`$10^5\ \text{Pa}$`, r`$10^6\ \text{Pa}$`], answer: 'C',
    solution: r`$p = \rho g h = 1000 \times 10 \times 10 = 10^5\ \text{Pa}$.`,
  }),
  mcq({
    ...ex('ts-eamcet', 'chemistry'), ref: 'sample.ts.c1', chapter: 'alcohols-phenols-and-ethers',
    body: 'With the Lucas reagent (anhydrous ZnCl₂ in concentrated HCl), turbidity appears immediately at room temperature for',
    options: ['a primary alcohol', 'a secondary alcohol', 'a tertiary alcohol', 'methanol'], answer: 'C',
    solution: 'Tertiary alcohols form stable tertiary carbocations, so the insoluble alkyl chloride separates almost immediately. Secondary alcohols take a few minutes; primary alcohols do not react appreciably at room temperature.',
  }),
  mcq({
    ...ex('ts-eamcet', 'mathematics'), ref: 'sample.ts.m1', chapter: 'application-of-derivatives', difficulty: 'easy',
    body: r`The slope of the tangent to the curve $y = x^3$ at $x = 2$ is`,
    options: ['4', '8', '12', '6'], answer: 'C',
    solution: r`$\dfrac{dy}{dx} = 3x^2 = 3(4) = 12$.`,
  }),
  // KEAM
  mcq({
    ...ex('keam', 'physics'), ref: 'sample.keam.p1', chapter: 'rotational-motion', difficulty: 'easy',
    body: r`A force of $5\ \text{N}$ acts perpendicular to a spanner at a distance of $2\ \text{m}$ from the axis. The magnitude of the torque is`,
    options: [r`$2.5\ \text{N m}$`, r`$7\ \text{N m}$`, r`$10\ \text{N m}$`, r`$20\ \text{N m}$`], answer: 'C',
    solution: r`$\tau = rF\sin 90^\circ = 2 \times 5 = 10\ \text{N m}$.`,
  }),
  mcq({
    ...ex('keam', 'chemistry'), ref: 'sample.keam.c1', chapter: 'haloalkanes-and-haloarenes',
    body: r`An $S_N2$ reaction at a chiral carbon proceeds with`,
    options: ['retention of configuration', 'inversion of configuration', 'complete racemisation', 'no change in the carbon skeleton or configuration'], answer: 'B',
    solution: r`In $S_N2$ the nucleophile attacks from the side opposite the leaving group in a single step, giving Walden inversion of configuration.`,
  }),
  mcq({
    ...ex('keam', 'mathematics'), ref: 'sample.keam.m1', chapter: 'ellipse',
    body: r`The eccentricity of the ellipse $\dfrac{x^2}{25} + \dfrac{y^2}{16} = 1$ is`,
    options: [r`$\tfrac{3}{5}$`, r`$\tfrac{4}{5}$`, r`$\tfrac{9}{25}$`, r`$\tfrac{5}{3}$`], answer: 'A',
    solution: r`$a^2 = 25$, $b^2 = 16$: $e = \sqrt{1 - \dfrac{b^2}{a^2}} = \sqrt{\dfrac{9}{25}} = \dfrac{3}{5}$.`,
  }),
  // GUJCET
  mcq({
    ...ex('gujcet', 'physics'), ref: 'sample.gujcet.p1', chapter: 'capacitor', difficulty: 'easy',
    body: r`Capacitors of $2\ \mu\text{F}$ and $3\ \mu\text{F}$ are connected in parallel. The equivalent capacitance is`,
    options: [r`$1.2\ \mu\text{F}$`, r`$5\ \mu\text{F}$`, r`$6\ \mu\text{F}$`, r`$1\ \mu\text{F}$`], answer: 'B',
    solution: r`In parallel, capacitances add: $C = 2 + 3 = 5\ \mu\text{F}$.`,
  }),
  mcq({
    ...ex('gujcet', 'chemistry'), ref: 'sample.gujcet.c1', chapter: 'structure-of-atom', difficulty: 'easy',
    body: r`The maximum number of electrons that can be accommodated in the shell with $n = 2$ is`,
    options: ['2', '4', '8', '18'], answer: 'C',
    solution: r`Maximum electrons $= 2n^2 = 2(2)^2 = 8$.`,
  }),
  mcq({
    ...ex('gujcet', 'mathematics'), ref: 'sample.gujcet.m1', chapter: 'statistics', difficulty: 'easy',
    body: 'The arithmetic mean of 2, 4, 6, 8 and 10 is',
    options: ['5', '6', '7', '8'], answer: 'B',
    solution: r`$\dfrac{2 + 4 + 6 + 8 + 10}{5} = \dfrac{30}{5} = 6$.`,
  }),
  // OJEE
  mcq({
    ...ex('ojee', 'physics'), ref: 'sample.ojee.p1', chapter: 'electromagnetic-waves',
    body: r`The speed of electromagnetic waves in vacuum is given by`,
    options: [r`$\sqrt{\mu_0 \varepsilon_0}$`, r`$\dfrac{1}{\sqrt{\mu_0 \varepsilon_0}}$`, r`$\dfrac{\mu_0}{\varepsilon_0}$`, r`$\mu_0 \varepsilon_0$`], answer: 'B',
    solution: r`Maxwell's equations give $c = 1/\sqrt{\mu_0\varepsilon_0} \approx 3 \times 10^8\ \text{m s}^{-1}$.`,
  }),
  mcq({
    ...ex('ojee', 'chemistry'), ref: 'sample.ojee.c1', chapter: 'chemical-kinetics',
    body: 'The SI unit of the rate constant of a first-order reaction is',
    options: [r`$\text{mol L}^{-1}\,\text{s}^{-1}$`, r`$\text{s}^{-1}$`, r`$\text{L mol}^{-1}\,\text{s}^{-1}$`, 'dimensionless'], answer: 'B',
    solution: r`For rate $= k[A]$, $k = \dfrac{\text{mol L}^{-1}\text{s}^{-1}}{\text{mol L}^{-1}} = \text{s}^{-1}$.`,
  }),
  mcq({
    ...ex('ojee', 'mathematics'), ref: 'sample.ojee.m1', chapter: 'inverse-trigonometric-functions', difficulty: 'easy',
    body: r`The principal value of $\sin^{-1}\!\left(\tfrac{1}{2}\right)$ is`,
    options: [r`$\dfrac{\pi}{3}$`, r`$\dfrac{\pi}{6}$`, r`$\dfrac{5\pi}{6}$`, r`$\dfrac{\pi}{4}$`], answer: 'B',
    solution: r`The principal range of $\sin^{-1}$ is $[-\pi/2, \pi/2]$, and $\sin(\pi/6) = 1/2$.`,
  }),
];

export const ALL_SAMPLE_QUESTIONS: Q[] = [...JEE_MAIN, ...JEE_ADV, ...NEET, ...STATE];

/** Sample practice sets: one per exam, containing that exam's sample questions in subject order. */
function samplePapers(questions: Q[]) {
  const papers: ImportFile['papers'] = [];
  for (const exam of EXAMS) {
    const qs = questions.filter((q) => q.exam === exam.slug);
    if (!qs.length) continue;
    const subjects = exam.subjects.filter((s) => qs.some((q) => q.subject === s.slug));
    const ref = `sample.paper.${exam.slug}.1`;
    let n = 0;
    for (const s of subjects) {
      for (const q of qs.filter((q) => q.subject === s.slug)) {
        q.papers = [...q.papers, { paper: ref, number: ++n, section: s.slug }];
      }
    }
    papers.push({
      ref,
      exam: exam.slug,
      slug: 'sample-practice-set-1',
      title: `${exam.shortName} Sample Practice Set 1`,
      kind: 'sample',
      duration_minutes: Math.max(10, Math.round(qs.length * 2.5)),
      sections: subjects.map((s) => ({ key: s.slug, name: s.name, subject_slug: s.slug })),
      availability: 'full',
      verification_status: 'unverified',
      notes: 'Original practice set written for PrepLedger. Not a past examination paper.',
    });
  }
  return papers;
}

export function buildSampleImport(): ImportFile {
  const questions = ALL_SAMPLE_QUESTIONS.map((q) => ({ ...q, papers: [...q.papers] }));
  const papers = samplePapers(questions);
  return {
    format_version: 1,
    source: {
      source_type: 'original_sample',
      title: 'PrepLedger original sample questions',
      publisher: 'PrepLedger',
      license: 'CC BY 4.0 — original work authored for PrepLedger',
      rights_holder: 'PrepLedger contributors',
      permission_note: 'Written specifically for this project as demonstration content. Not copied from any past paper, book or third-party website.',
      notes: 'Sample data. Not past-year questions. Answer keys are editorial, not official.',
    },
    papers,
    diagrams: [
      { ref: 'incline-30', url: '/assets/diagrams/incline-30.svg', alt_text: 'A 2 kg block resting on a smooth plane inclined at 30 degrees to the horizontal.', width: 360, height: 200, license: 'CC BY 4.0 — original PrepLedger diagram' },
      { ref: 'circuit-6-3-4', url: '/assets/diagrams/circuit-6-3-4.svg', alt_text: 'Circuit with a 12 V battery, a 6 ohm and a 3 ohm resistor in parallel, followed by a 4 ohm resistor in series.', width: 380, height: 214, license: 'CC BY 4.0 — original PrepLedger diagram' },
      { ref: 'energy-pyramid', url: '/assets/diagrams/energy-pyramid.svg', alt_text: 'Pyramid of energy with four trophic levels; producers at the base hold 10,000 joules.', caption: 'Pyramid of energy (not to scale)', width: 360, height: 220, license: 'CC BY 4.0 — original PrepLedger diagram' },
    ],
    passages: [
      {
        ref: KINETICS_PASSAGE,
        title: 'Passage: first-order decomposition',
        body: r`A substance $\ce{A}$ decomposes by first-order kinetics, $\ce{A -> products}$, with a rate constant $k = 0.0693\ \text{min}^{-1}$ at a fixed temperature. Answer the following questions based on this information. (Take $\ln 2 = 0.693$.)`,
      },
    ],
    questions,
  };
}

/**
 * Past paper METADATA ONLY (no questions). Dates are factual schedule information; they are
 * marked unverified until an editor confirms them against the official notice.
 */
export function buildPaperMetadataImport(): ImportFile {
  const jmDays: [string, string][] = [
    ['2024-01-27', 'January'], ['2024-01-29', 'January'], ['2024-01-30', 'January'], ['2024-01-31', 'January'], ['2024-02-01', 'January'],
    ['2024-04-04', 'April'], ['2024-04-05', 'April'], ['2024-04-06', 'April'], ['2024-04-08', 'April'], ['2024-04-09', 'April'],
  ];
  const month = (d: string) => new Date(d + 'T00:00:00Z').toLocaleString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const papers: ImportFile['papers'] = [];
  for (const [d, session] of jmDays) {
    for (const shift of ['Morning', 'Evening']) {
      papers.push({
        ref: `meta.jee-main.${d}.${shift.toLowerCase()}`,
        exam: 'jee-main',
        title: `JEE Main 2024 (Online) ${month(d)} ${shift} Shift`,
        kind: 'past_paper', year: 2024, session, exam_date: d, shift, duration_minutes: 180, total_marks: 300,
        sections: [{ key: 'physics', name: 'Physics' }, { key: 'chemistry', name: 'Chemistry' }, { key: 'mathematics', name: 'Mathematics' }],
        availability: 'metadata_only', verification_status: 'unverified',
        notes: 'Paper record only. Questions have not been imported because no licensed source is available to this build.',
      });
    }
  }
  for (const [year, d] of [[2024, '2024-05-26'], [2023, '2023-06-04']] as const) {
    for (const n of [1, 2]) {
      papers.push({
        ref: `meta.jee-advanced.${year}.p${n}`, exam: 'jee-advanced', title: `JEE Advanced ${year} Paper ${n}`,
        kind: 'past_paper', year, session: `Paper ${n}`, exam_date: d, paper_number: n, duration_minutes: 180,
        sections: [], availability: 'metadata_only', verification_status: 'unverified',
        notes: 'Paper record only. Questions have not been imported.',
      });
    }
  }
  for (const [year, d] of [[2024, '2024-05-05'], [2023, '2023-05-07']] as const) {
    papers.push({
      ref: `meta.neet.${year}`, exam: 'neet', title: `NEET ${year}`, kind: 'past_paper', year, exam_date: d, duration_minutes: 200,
      sections: [], availability: 'metadata_only', verification_status: 'unverified',
      notes: 'Paper record only. Questions have not been imported.',
    });
  }
  return {
    format_version: 1,
    source: {
      source_type: 'official_document',
      title: 'Examination schedule metadata (public notices)',
      license: 'Factual information — no question content reproduced',
      permission_note: 'Exam names, dates and shift labels are facts about public examinations; no copyrighted question text is included.',
      notes: 'Entered from editor knowledge; each record stays "unverified" until checked against the official notice.',
    },
    papers,
    diagrams: [],
    passages: [],
    questions: [],
  };
}
