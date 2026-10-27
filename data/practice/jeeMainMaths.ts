import { builder, r } from './helpers';

const { mcq, num, int } = builder({ exam: 'jee-main', subject: 'mathematics', prefix: 'prac1.jm.math' });

export const JEE_MAIN_MATHS = [
  // Sets and Relations
  int('sets-and-relations', r`The number of subsets of a set with $4$ elements is ______.`, 16,
    r`Each element is either in or out of a subset: $2^4 = 16$ subsets.`, 'easy'),
  mcq('sets-and-relations', r`On $A = \{1, 2, 3\}$, the relation $R = \{(1,1), (2,2), (3,3), (1,2)\}$ is`,
    ['reflexive and symmetric but not transitive', 'reflexive and transitive but not symmetric', 'an equivalence relation', 'symmetric and transitive but not reflexive'], 'B',
    r`All $(a,a)$ are present, so $R$ is reflexive. $(1,2) \in R$ but $(2,1) \notin R$, so it is not symmetric. Every composable pair stays in $R$ (e.g. $(1,1),(1,2) \Rightarrow (1,2)$), so it is transitive.`),

  // Logarithm
  int('logarithm', r`The value of $\log_2 8 + \log_3 9$ is ______.`, 5,
    r`$\log_2 8 = 3$ and $\log_3 9 = 2$, so the sum is $5$.`, 'easy'),
  num('logarithm', r`Given $\log_{10} 2 = 0.3010$, the value of $\log_{10} 8$ is ______.`, 0.903,
    r`$\log_{10} 8 = 3\log_{10} 2 = 3 \times 0.3010 = 0.9030$.`, { tol: 0.001, difficulty: 'easy' }),

  // Quadratic Equation
  int('quadratic-equation-and-inequalities', r`The value of $k$ for which $x^2 - 6x + k = 0$ has equal roots is ______.`, 9,
    r`Equal roots need discriminant $36 - 4k = 0$, so $k = 9$.`, 'easy'),
  mcq('quadratic-equation-and-inequalities', r`The product of the roots of $2x^2 - 8x + 3 = 0$ is`,
    [r`$4$`, r`$\tfrac32$`, r`$-4$`, r`$-\tfrac32$`], 'B',
    r`Product $= c/a = 3/2$.`, 'easy'),

  // Complex Numbers
  mcq('complex-numbers', r`The value of $i^{57}$ is`,
    [r`$1$`, r`$-1$`, r`$i$`, r`$-i$`], 'C',
    r`$57 = 4 \times 14 + 1$, so $i^{57} = i^1 = i$.`, 'easy'),
  mcq('complex-numbers', r`The modulus of $z = \dfrac{3 + 4i}{1 - i}$ is`,
    [r`$5$`, r`$\dfrac{5}{\sqrt2}$`, r`$5\sqrt2$`, r`$\dfrac52$`], 'B',
    r`$|z| = \dfrac{|3+4i|}{|1-i|} = \dfrac{5}{\sqrt2}$.`),

  // Sequences and Series
  mcq('sequences-and-series', r`The sum of the infinite series $1 + \dfrac13 + \dfrac19 + \dfrac1{27} + \cdots$ is`,
    [r`$\tfrac43$`, r`$\tfrac32$`, r`$2$`, r`$3$`], 'B',
    r`Geometric series with $a = 1$, $r = \tfrac13$: $S_\infty = \dfrac{a}{1-r} = \dfrac{1}{2/3} = \dfrac32$.`, 'easy'),
  int('sequences-and-series', r`The $10^{\text{th}}$ term of the arithmetic progression $3, 7, 11, \ldots$ is ______.`, 39,
    r`$a_{10} = a + 9d = 3 + 9 \times 4 = 39$.`, 'easy'),

  // Permutations and Combinations
  int('permutations-and-combinations', r`The number of ways to choose $3$ students from a group of $7$ is ______.`, 35,
    r`$\binom{7}{3} = \dfrac{7 \cdot 6 \cdot 5}{3!} = 35$.`, 'easy'),
  int('permutations-and-combinations', r`The number of distinct arrangements of the letters of the word APPLE is ______.`, 60,
    r`5 letters with P repeated twice: $\dfrac{5!}{2!} = 60$.`, 'easy'),

  // Binomial Theorem
  int('binomial-theorem', r`The term independent of $x$ in the expansion of $\left(x + \dfrac1x\right)^{10}$ is ______.`, 252,
    r`$T_{r+1} = \binom{10}{r} x^{10-r}x^{-r} = \binom{10}{r}x^{10-2r}$. Independent of $x$ when $r = 5$: $\binom{10}{5} = 252$.`),
  int('binomial-theorem', r`The sum of the coefficients in the expansion of $(1 + x)^8$ is ______.`, 256,
    r`Put $x = 1$: $(1+1)^8 = 256$.`, 'easy'),

  // Matrices and Determinants
  int('matrices-and-determinants', r`If $A$ is a $3 \times 3$ matrix with $|A| = 4$, then $|2A|$ is ______.`, 32,
    r`For an $n \times n$ matrix, $|kA| = k^n|A|$: $|2A| = 2^3 \times 4 = 32$.`),
  mcq('matrices-and-determinants', r`The inverse of $\begin{pmatrix} 2 & 1 \\ 1 & 1 \end{pmatrix}$ is`,
    [r`$\begin{pmatrix} 1 & -1 \\ -1 & 2 \end{pmatrix}$`, r`$\begin{pmatrix} 1 & 1 \\ 1 & 2 \end{pmatrix}$`, r`$\begin{pmatrix} -1 & 1 \\ 1 & -2 \end{pmatrix}$`, r`$\begin{pmatrix} 2 & -1 \\ -1 & 1 \end{pmatrix}$`], 'A',
    r`$\det = 2 - 1 = 1$. For $\begin{pmatrix} a & b \\ c & d \end{pmatrix}$, the inverse is $\dfrac{1}{\det}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix} = \begin{pmatrix} 1 & -1 \\ -1 & 2 \end{pmatrix}$.`, 'easy'),

  // Probability
  num('probability', r`$A$ and $B$ are independent events with $P(A) = 0.5$ and $P(B) = 0.4$. The value of $P(A \cup B)$ is ______.`, 0.7,
    r`$P(A \cap B) = 0.5 \times 0.4 = 0.2$. $P(A \cup B) = 0.5 + 0.4 - 0.2 = 0.7$.`, { difficulty: 'easy' }),
  mcq('probability', 'A fair die is thrown twice. The probability of getting at least one six is',
    [r`$\tfrac16$`, r`$\tfrac{1}{36}$`, r`$\tfrac{11}{36}$`, r`$\tfrac{25}{36}$`], 'C',
    r`$P(\text{no six}) = \left(\tfrac56\right)^2 = \tfrac{25}{36}$, so $P(\text{at least one}) = 1 - \tfrac{25}{36} = \tfrac{11}{36}$.`),

  // Statistics
  int('statistics', r`The variance of the data $1, 2, 3, 4, 5$ is ______.`, 2,
    r`Mean $= 3$. Squared deviations: $4, 1, 0, 1, 4$, sum $10$. Variance $= 10/5 = 2$.`, 'easy'),
  mcq('statistics', r`The median of $3, 8, 1, 9, 5$ is`,
    ['3', '5', '8', '5.2'], 'B',
    r`Arranged: $1, 3, 5, 8, 9$. The middle (3rd) value is $5$.`, 'easy'),

  // Trigonometric Ratios
  mcq('trigonometric-ratios-and-identities', r`The value of $\sin 75^\circ$ is`,
    [r`$\dfrac{\sqrt6 - \sqrt2}{4}$`, r`$\dfrac{\sqrt6 + \sqrt2}{4}$`, r`$\dfrac{\sqrt3 + 1}{2}$`, r`$\dfrac{\sqrt3}{2}$`], 'B',
    r`$\sin(45^\circ + 30^\circ) = \sin45^\circ\cos30^\circ + \cos45^\circ\sin30^\circ = \dfrac{\sqrt3}{2\sqrt2} + \dfrac{1}{2\sqrt2} = \dfrac{\sqrt6 + \sqrt2}{4}$.`),
  int('trigonometric-ratios-and-identities', r`The maximum value of $3\sin x + 4\cos x$ is ______.`, 5,
    r`$a\sin x + b\cos x$ has maximum $\sqrt{a^2 + b^2} = \sqrt{9 + 16} = 5$.`, 'easy'),

  // Trigonometric Equations
  mcq('trigonometric-equations', r`The general solution of $\sin x = 0$ is ($n \in \mathbb{Z}$)`,
    [r`$x = n\pi$`, r`$x = 2n\pi$`, r`$x = (2n+1)\dfrac{\pi}{2}$`, r`$x = n\pi + \dfrac{\pi}{4}$`], 'A',
    r`$\sin x = 0$ at every integer multiple of $\pi$.`, 'easy'),
  int('trigonometric-equations', r`The number of solutions of $\tan x = 1$ in $[0, 2\pi]$ is ______.`, 2,
    r`$x = \dfrac{\pi}{4}$ and $x = \dfrac{5\pi}{4}$ (period $\pi$).`, 'easy'),

  // Inverse Trigonometric Functions
  mcq('inverse-trigonometric-functions', r`The value of $\tan^{-1}1 + \tan^{-1}\dfrac12 + \tan^{-1}\dfrac13$ is`,
    [r`$\dfrac{\pi}{4}$`, r`$\dfrac{\pi}{2}$`, r`$\dfrac{3\pi}{4}$`, r`$\pi$`], 'B',
    r`$\tan^{-1}\tfrac12 + \tan^{-1}\tfrac13 = \tan^{-1}\dfrac{\tfrac12 + \tfrac13}{1 - \tfrac16} = \tan^{-1}1 = \dfrac\pi4$. Adding $\tan^{-1}1 = \dfrac\pi4$ gives $\dfrac\pi2$.`),
  num('inverse-trigonometric-functions', r`The value of $\cos\left(\sin^{-1}\dfrac35\right)$ is ______.`, 0.8,
    r`Let $\theta = \sin^{-1}\tfrac35 \in [0, \tfrac\pi2]$. Then $\cos\theta = \sqrt{1 - \tfrac{9}{25}} = \tfrac45 = 0.8$.`, { difficulty: 'easy' }),

  // Properties of Triangle
  num('properties-of-triangle', r`The circumradius of a triangle with sides $3$, $4$ and $5$ is ______.`, 2.5,
    r`It is right-angled (3-4-5), so the hypotenuse is a diameter: $R = 5/2 = 2.5$.`, { difficulty: 'easy' }),
  mcq('properties-of-triangle', r`In $\triangle ABC$, $A = 60^\circ$, $b = 2$ and $c = 3$. The side $a$ equals`,
    [r`$\sqrt5$`, r`$\sqrt7$`, r`$\sqrt{13}$`, r`$\sqrt{19}$`], 'B',
    r`Cosine rule: $a^2 = b^2 + c^2 - 2bc\cos A = 4 + 9 - 12 \times \tfrac12 = 7$, so $a = \sqrt7$.`),

  // Straight Lines
  int('straight-lines-and-pair-of-straight-lines', r`The perpendicular distance of the point $(1, 2)$ from the line $3x + 4y - 1 = 0$ is ______.`, 2,
    r`$d = \dfrac{|3(1) + 4(2) - 1|}{\sqrt{9 + 16}} = \dfrac{10}{5} = 2$.`, 'easy'),
  mcq('straight-lines-and-pair-of-straight-lines', r`The lines $2x + 3y = 5$ and $3x - 2y = 7$ are`,
    ['parallel', 'perpendicular', 'coincident', 'inclined at 45°'], 'B',
    r`Slopes are $-\tfrac23$ and $\tfrac32$; their product is $-1$, so the lines are perpendicular.`, 'easy'),

  // Circle
  mcq('circle', r`The equation of the tangent to $x^2 + y^2 = 25$ at the point $(3, 4)$ is`,
    [r`$3x + 4y = 25$`, r`$4x + 3y = 25$`, r`$3x - 4y = 25$`, r`$3x + 4y = 5$`], 'A',
    r`The tangent to $x^2 + y^2 = a^2$ at $(x_1, y_1)$ is $xx_1 + yy_1 = a^2$: $3x + 4y = 25$.`, 'easy'),
  mcq('circle', r`The length of the tangent from the point $(5, 5)$ to the circle $x^2 + y^2 = 9$ is`,
    [r`$\sqrt{41}$`, r`$\sqrt{50}$`, r`$4$`, r`$\sqrt{34}$`], 'A',
    r`Length $= \sqrt{S_1} = \sqrt{25 + 25 - 9} = \sqrt{41}$.`),

  // Parabola
  mcq('parabola', r`The focus of the parabola $y^2 = 12x$ is`,
    [r`$(0, 3)$`, r`$(3, 0)$`, r`$(12, 0)$`, r`$(-3, 0)$`], 'B',
    r`Comparing with $y^2 = 4ax$: $4a = 12$, $a = 3$, focus $(a, 0) = (3, 0)$.`, 'easy'),
  int('parabola', r`The length of the latus rectum of the parabola $x^2 = 8y$ is ______.`, 8,
    r`$x^2 = 4ay$ with $4a = 8$; latus rectum $= 4a = 8$.`, 'easy'),

  // Ellipse
  num('ellipse', r`The length of the latus rectum of the ellipse $\dfrac{x^2}{16} + \dfrac{y^2}{9} = 1$ is ______.`, 4.5,
    r`$\dfrac{2b^2}{a} = \dfrac{2 \times 9}{4} = 4.5$.`, { difficulty: 'easy' }),
  mcq('ellipse', r`The foci of the ellipse $\dfrac{x^2}{16} + \dfrac{y^2}{9} = 1$ are`,
    [r`$(\pm 5, 0)$`, r`$(\pm\sqrt7, 0)$`, r`$(0, \pm\sqrt7)$`, r`$(\pm 4, 0)$`], 'B',
    r`$c^2 = a^2 - b^2 = 16 - 9 = 7$, with the major axis along $x$: foci $(\pm\sqrt7, 0)$.`, 'easy'),

  // Hyperbola
  mcq('hyperbola', r`The eccentricity of the hyperbola $\dfrac{x^2}{9} - \dfrac{y^2}{16} = 1$ is`,
    [r`$\tfrac43$`, r`$\tfrac53$`, r`$\tfrac54$`, r`$\tfrac35$`], 'B',
    r`$e = \sqrt{1 + \dfrac{b^2}{a^2}} = \sqrt{1 + \dfrac{16}{9}} = \dfrac53$.`, 'easy'),
  mcq('hyperbola', r`The asymptotes of the hyperbola $\dfrac{x^2}{9} - \dfrac{y^2}{16} = 1$ are`,
    [r`$y = \pm\dfrac34 x$`, r`$y = \pm\dfrac43 x$`, r`$y = \pm\dfrac{16}{9}x$`, r`$y = \pm x$`], 'B',
    r`Asymptotes are $y = \pm\dfrac{b}{a}x = \pm\dfrac43 x$.`, 'easy'),

  // Functions
  mcq('functions', r`The domain of $f(x) = \sqrt{4 - x^2}$ is`,
    [r`$(-2, 2)$`, r`$[-2, 2]$`, r`$[0, 2]$`, r`$\mathbb{R}$`], 'B',
    r`Need $4 - x^2 \ge 0$, i.e. $-2 \le x \le 2$.`, 'easy'),
  int('functions', r`If $f(x) = 2x + 3$, then $f^{-1}(7)$ is ______.`, 2,
    r`Solve $2x + 3 = 7$: $x = 2$.`, 'easy'),

  // Limits, Continuity and Differentiability
  mcq('limits-continuity-and-differentiability', r`$\displaystyle\lim_{x \to 0} \frac{e^x - 1}{x}$ equals`,
    [r`$0$`, r`$1$`, r`$e$`, 'does not exist'], 'B',
    r`Standard limit (it is the derivative of $e^x$ at $0$): the value is $1$.`, 'easy'),
  int('limits-continuity-and-differentiability', r`The value of $\displaystyle\lim_{x \to \infty} \frac{2x^2 + 3}{x^2 + 1}$ is ______.`, 2,
    r`Divide numerator and denominator by $x^2$: $\dfrac{2 + 3/x^2}{1 + 1/x^2} \to 2$.`, 'easy'),

  // Differentiation
  mcq('differentiation', r`$\dfrac{d}{dx}(x\sin x)$ equals`,
    [r`$\cos x$`, r`$x\cos x$`, r`$\sin x + x\cos x$`, r`$\sin x - x\cos x$`], 'C',
    r`Product rule: $\sin x \cdot 1 + x\cos x$.`, 'easy'),
  int('differentiation', r`The derivative of $\ln(x^2 + 1)$ at $x = 1$ is ______.`, 1,
    r`$\dfrac{2x}{x^2 + 1}$ at $x = 1$ equals $\dfrac{2}{2} = 1$.`, 'easy'),

  // Application of Derivatives
  int('application-of-derivatives', r`The minimum value of $f(x) = x^2 - 4x + 7$ is ______.`, 3,
    r`$f(x) = (x - 2)^2 + 3 \ge 3$, with equality at $x = 2$.`, 'easy'),
  mcq('application-of-derivatives', r`The radius of a circle increases at $2\ \text{cm s}^{-1}$. When the radius is $5\ \text{cm}$, the area increases at`,
    [r`$10\pi\ \text{cm}^2\text{s}^{-1}$`, r`$20\pi\ \text{cm}^2\text{s}^{-1}$`, r`$25\pi\ \text{cm}^2\text{s}^{-1}$`, r`$4\pi\ \text{cm}^2\text{s}^{-1}$`], 'B',
    r`$\dfrac{dA}{dt} = 2\pi r\dfrac{dr}{dt} = 2\pi(5)(2) = 20\pi\ \text{cm}^2\text{s}^{-1}$.`),

  // Indefinite Integrals
  mcq('indefinite-integrals', r`$\displaystyle\int \frac{dx}{1 + x^2}$ equals`,
    [r`$\ln(1 + x^2) + C$`, r`$\tan^{-1}x + C$`, r`$\sin^{-1}x + C$`, r`$\dfrac{1}{1+x^2} + C$`], 'B',
    r`$\dfrac{d}{dx}\tan^{-1}x = \dfrac{1}{1 + x^2}$.`, 'easy'),
  mcq('indefinite-integrals', r`$\displaystyle\int x e^x\,dx$ equals`,
    [r`$xe^x + C$`, r`$e^x(x - 1) + C$`, r`$e^x(x + 1) + C$`, r`$\dfrac{x^2}{2}e^x + C$`], 'B',
    r`By parts with $u = x$, $dv = e^x dx$: $xe^x - \int e^x dx = e^x(x - 1) + C$.`),

  // Definite Integration
  int('definite-integration', r`The value of $\displaystyle\int_0^{\pi/2} \sin x\,dx$ is ______.`, 1,
    r`$[-\cos x]_0^{\pi/2} = 0 - (-1) = 1$.`, 'easy'),
  int('definite-integration', r`The value of $\displaystyle\int_{-1}^{1} x^3\,dx$ is ______.`, 0,
    r`$x^3$ is odd and the interval is symmetric about $0$, so the integral is $0$.`, 'easy'),

  // Area Under the Curves
  mcq('area-under-the-curves', r`The area of the region bounded by $y = x^2$ and the line $y = 4$ is`,
    [r`$\tfrac{16}{3}$`, r`$\tfrac{32}{3}$`, r`$8$`, r`$\tfrac{64}{3}$`], 'B',
    r`They meet at $x = \pm2$. Area $= \int_{-2}^{2}(4 - x^2)\,dx = 16 - \tfrac{16}{3} = \tfrac{32}{3}$.`),
  mcq('area-under-the-curves', r`The area enclosed between $y = x$ and $y = x^2$ is`,
    [r`$\tfrac12$`, r`$\tfrac13$`, r`$\tfrac16$`, r`$\tfrac14$`], 'C',
    r`They meet at $x = 0, 1$. Area $= \int_0^1 (x - x^2)\,dx = \tfrac12 - \tfrac13 = \tfrac16$.`),

  // Differential Equations
  mcq('differential-equations', r`The order and degree of $\left(\dfrac{d^2y}{dx^2}\right)^3 + \dfrac{dy}{dx} = 0$ are`,
    ['order 3, degree 2', 'order 2, degree 3', 'order 2, degree 1', 'order 1, degree 3'], 'B',
    r`The highest derivative is $\dfrac{d^2y}{dx^2}$ (order 2), raised to the power 3 in a polynomial equation (degree 3).`, 'easy'),
  int('differential-equations', r`If $\dfrac{dy}{dx} = y$ and $y(0) = 2$, then $y(\ln 3)$ is ______.`, 6,
    r`$y = Ce^x$ with $C = 2$, so $y(\ln 3) = 2e^{\ln3} = 6$.`, 'easy'),

  // Vector Algebra
  int('vector-algebra', r`$|\vec a| = 3$, $|\vec b| = 4$ and the angle between them is $30^\circ$. The value of $|\vec a \times \vec b|$ is ______.`, 6,
    r`$|\vec a \times \vec b| = |\vec a||\vec b|\sin\theta = 3 \times 4 \times \tfrac12 = 6$.`, 'easy'),
  mcq('vector-algebra', r`The scalar projection of $\vec a = 2\hat i + 3\hat j$ on $\vec b = \hat i + \hat j$ is`,
    [r`$5$`, r`$\dfrac{5}{\sqrt2}$`, r`$\dfrac{5}{\sqrt{13}}$`, r`$\dfrac52$`], 'B',
    r`Projection $= \dfrac{\vec a\cdot\vec b}{|\vec b|} = \dfrac{2 + 3}{\sqrt2} = \dfrac{5}{\sqrt2}$.`),

  // 3D Geometry
  int('3d-geometry', r`The distance between the points $(1, 2, 3)$ and $(4, 6, 3)$ is ______.`, 5,
    r`$\sqrt{3^2 + 4^2 + 0^2} = 5$.`, 'easy'),
  mcq('3d-geometry', 'The direction cosines of a line equally inclined to the three positive coordinate axes are',
    [r`$\left(1, 1, 1\right)$`, r`$\left(\tfrac{1}{\sqrt3}, \tfrac{1}{\sqrt3}, \tfrac{1}{\sqrt3}\right)$`, r`$\left(\tfrac13, \tfrac13, \tfrac13\right)$`, r`$\left(\tfrac12, \tfrac12, \tfrac12\right)$`], 'B',
    r`$l = m = n$ and $l^2 + m^2 + n^2 = 1$, so $3l^2 = 1$ and $l = \tfrac{1}{\sqrt3}$.`, 'easy'),
];
