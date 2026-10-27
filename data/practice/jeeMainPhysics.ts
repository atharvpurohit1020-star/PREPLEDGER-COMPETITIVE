import { builder, r } from './helpers';

const { mcq, num, int } = builder({ exam: 'jee-main', subject: 'physics', prefix: 'prac1.jm.phy' });

export const JEE_MAIN_PHYSICS = [
  // Units & Measurements
  mcq('units-and-measurements', r`The SI unit of the coefficient of viscosity $\eta$ (defined by $F = \eta A \dfrac{dv}{dx}$) is`,
    [r`$\text{N m s}^{-1}$`, r`$\text{N s m}^{-2}$`, r`$\text{kg m s}^{-1}$`, r`$\text{kg m}^{-1}\text{s}^{-2}$`], 'B',
    r`$\eta = \dfrac{F}{A\,(dv/dx)}$ has units $\dfrac{\text{N}}{\text{m}^2 \cdot \text{s}^{-1}} = \text{N s m}^{-2}$ (i.e. pascal-second).`, 'easy'),
  int('units-and-measurements', r`The momentum of a body is measured with a percentage error of $2\%$ while its mass is known exactly. The percentage error in its kinetic energy, calculated as $K = \dfrac{p^2}{2m}$, is ______.`, 4,
    r`For $K \propto p^2$, relative errors add with the power: $\dfrac{\Delta K}{K} = 2\dfrac{\Delta p}{p} = 2 \times 2\% = 4\%$.`),

  // Motion in a Straight Line
  mcq('motion-in-a-straight-line', r`A car starts from rest and accelerates uniformly to $20\ \text{m s}^{-1}$ in $5\ \text{s}$. The distance covered in this time is`,
    [r`$25\ \text{m}$`, r`$40\ \text{m}$`, r`$50\ \text{m}$`, r`$100\ \text{m}$`], 'C',
    r`$a = 20/5 = 4\ \text{m s}^{-2}$, so $s = \tfrac12 a t^2 = \tfrac12 (4)(25) = 50\ \text{m}$. (Equivalently, average speed $10\ \text{m s}^{-1}$ for $5\ \text{s}$.)`, 'easy'),
  num('motion-in-a-straight-line', r`A stone is dropped from the top of a $45\ \text{m}$ high tower. Taking $g = 10\ \text{m s}^{-2}$, the time (in s) it takes to reach the ground is ______.`, 3,
    r`$h = \tfrac12 g t^2 \Rightarrow t = \sqrt{2h/g} = \sqrt{90/10} = 3\ \text{s}$.`),

  // Motion in a Plane
  mcq('motion-in-a-plane', r`A projectile is launched with speed $20\ \text{m s}^{-1}$ at $45^\circ$ to the horizontal. Its horizontal range is ($g = 10\ \text{m s}^{-2}$)`,
    [r`$20\ \text{m}$`, r`$20\sqrt{2}\ \text{m}$`, r`$40\ \text{m}$`, r`$80\ \text{m}$`], 'C',
    r`$R = \dfrac{u^2 \sin 2\theta}{g} = \dfrac{400 \times \sin 90^\circ}{10} = 40\ \text{m}$.`, 'easy'),
  num('motion-in-a-plane', r`A ball is projected with speed $20\ \text{m s}^{-1}$ at $30^\circ$ above the horizontal. The maximum height reached (in m) is ______. ($g = 10\ \text{m s}^{-2}$)`, 5,
    r`$H = \dfrac{(u\sin\theta)^2}{2g} = \dfrac{(20 \times \tfrac12)^2}{20} = \dfrac{100}{20} = 5\ \text{m}$.`),

  // Laws of Motion
  mcq('laws-of-motion', r`Blocks of mass $2\ \text{kg}$ and $3\ \text{kg}$ are in contact on a smooth horizontal floor. A horizontal force of $10\ \text{N}$ pushes the $2\ \text{kg}$ block. The force exerted by the $2\ \text{kg}$ block on the $3\ \text{kg}$ block is`,
    [r`$4\ \text{N}$`, r`$6\ \text{N}$`, r`$10\ \text{N}$`, r`$2\ \text{N}$`], 'B',
    r`Common acceleration $a = \dfrac{10}{2+3} = 2\ \text{m s}^{-2}$. The $3\ \text{kg}$ block needs $F = 3 \times 2 = 6\ \text{N}$, which is supplied by the contact force.`),
  num('laws-of-motion', r`A block slides on a rough horizontal surface with initial speed $10\ \text{m s}^{-1}$. The coefficient of kinetic friction is $0.2$ and $g = 10\ \text{m s}^{-2}$. The distance (in m) it travels before stopping is ______.`, 25,
    r`Retardation $a = \mu g = 2\ \text{m s}^{-2}$. $s = \dfrac{v^2}{2a} = \dfrac{100}{4} = 25\ \text{m}$.`),

  // Work Power & Energy
  mcq('work-power-and-energy', r`The power needed to lift a $50\ \text{kg}$ load vertically at a constant speed of $2\ \text{m s}^{-1}$ is ($g = 10\ \text{m s}^{-2}$)`,
    [r`$100\ \text{W}$`, r`$500\ \text{W}$`, r`$1000\ \text{W}$`, r`$2000\ \text{W}$`], 'C',
    r`At constant speed the applied force equals the weight: $P = Fv = mgv = 50 \times 10 \times 2 = 1000\ \text{W}$.`, 'easy'),
  num('work-power-and-energy', r`A spring of force constant $200\ \text{N m}^{-1}$ is compressed by $10\ \text{cm}$. The elastic potential energy stored (in J) is ______.`, 1,
    r`$U = \tfrac12 k x^2 = \tfrac12 (200)(0.1)^2 = 1\ \text{J}$.`, { difficulty: 'easy' }),

  // Center of Mass and Collision
  mcq('center-of-mass-and-collision', r`A $2\ \text{kg}$ ball moving at $3\ \text{m s}^{-1}$ collides with and sticks to a stationary $1\ \text{kg}$ ball. The kinetic energy lost in the collision is`,
    [r`$3\ \text{J}$`, r`$6\ \text{J}$`, r`$9\ \text{J}$`, r`$1.5\ \text{J}$`], 'A',
    r`Momentum: $2 \times 3 = 3v \Rightarrow v = 2\ \text{m s}^{-1}$. Initial KE $= \tfrac12 (2)(9) = 9\ \text{J}$; final KE $= \tfrac12 (3)(4) = 6\ \text{J}$. Loss $= 3\ \text{J}$.`),
  mcq('center-of-mass-and-collision', r`In a perfectly elastic head-on collision between two equal masses, one of which is initially at rest, the moving body after collision`,
    ['continues with the same velocity', 'comes to rest', 'moves with half its initial velocity', 'rebounds with the same speed'], 'B',
    r`For equal masses in an elastic head-on collision the velocities are exchanged: the incoming body stops and the target moves off with the incoming velocity.`, 'easy'),

  // Rotational Motion
  mcq('rotational-motion', r`A solid cylinder rolls without slipping on a horizontal surface. The fraction of its total kinetic energy that is rotational is`,
    [r`$\tfrac12$`, r`$\tfrac13$`, r`$\tfrac23$`, r`$\tfrac14$`], 'B',
    r`$I = \tfrac12 mR^2$, $\omega = v/R$: rotational KE $= \tfrac14 mv^2$, translational $= \tfrac12 mv^2$, total $= \tfrac34 mv^2$. Fraction $= \dfrac{1/4}{3/4} = \dfrac13$.`),
  num('rotational-motion', r`A skater spinning at $2\ \text{rad s}^{-1}$ pulls in her arms, reducing her moment of inertia to half its value. Her new angular speed (in $\text{rad s}^{-1}$) is ______.`, 4,
    r`No external torque, so $I_1\omega_1 = I_2\omega_2 \Rightarrow \omega_2 = \dfrac{I_1}{I_1/2} \times 2 = 4\ \text{rad s}^{-1}$.`, { difficulty: 'easy' }),

  // Gravitation
  mcq('gravitation', r`The acceleration due to gravity at a height equal to the Earth's radius $R$ above the surface is ($g$ = value at the surface)`,
    [r`$g/2$`, r`$g/4$`, r`$g/\sqrt{2}$`, r`$g/8$`], 'B',
    r`$g_h = g\left(\dfrac{R}{R+h}\right)^2 = g\left(\dfrac{R}{2R}\right)^2 = \dfrac g4$.`, 'easy'),
  num('gravitation', r`The escape speed from the Earth is $11.2\ \text{km s}^{-1}$. A planet has the same average density as the Earth but twice its radius. The escape speed from the planet (in $\text{km s}^{-1}$) is ______.`, 22.4,
    r`$v_e = \sqrt{\dfrac{2GM}{R}}$ with $M = \tfrac43\pi R^3\rho$ gives $v_e = R\sqrt{\tfrac83 \pi G\rho} \propto R$ at fixed density. Doubling $R$ doubles $v_e$: $22.4\ \text{km s}^{-1}$.`),

  // Properties of Matter
  mcq('properties-of-matter', r`A wire of length $2\ \text{m}$ and cross-sectional area $1\ \text{mm}^2$ stretches by $1\ \text{mm}$ under a load of $100\ \text{N}$. Young's modulus of the material is`,
    [r`$2 \times 10^{9}\ \text{Pa}$`, r`$2 \times 10^{10}\ \text{Pa}$`, r`$2 \times 10^{11}\ \text{Pa}$`, r`$2 \times 10^{12}\ \text{Pa}$`], 'C',
    r`$Y = \dfrac{FL}{A\,\Delta L} = \dfrac{100 \times 2}{(10^{-6})(10^{-3})} = 2 \times 10^{11}\ \text{Pa}$.`),
  mcq('properties-of-matter', r`The same load hangs from two wires of the same material. Wire 2 has twice the length and twice the radius of wire 1. The extension of wire 2 compared with wire 1 is`,
    ['double', 'half', 'the same', 'four times'], 'B',
    r`$\Delta L = \dfrac{FL}{\pi r^2 Y} \propto \dfrac{L}{r^2}$. Ratio $= \dfrac{2}{2^2} = \dfrac12$.`),

  // Fluid Mechanics
  mcq('fluid-mechanics', r`A small sphere falls through a viscous liquid. If its radius is doubled (same material), its terminal velocity becomes`,
    ['twice', 'four times', 'eight times', 'half'], 'B',
    r`By Stokes' law, $v_t = \dfrac{2r^2(\rho - \sigma)g}{9\eta} \propto r^2$, so doubling $r$ multiplies $v_t$ by $4$.`),
  num('fluid-mechanics', r`Water flows through a horizontal pipe whose cross-section narrows from $10\ \text{cm}^2$ to $4\ \text{cm}^2$. If the speed in the wider part is $2\ \text{m s}^{-1}$, the speed (in $\text{m s}^{-1}$) in the narrower part is ______.`, 5,
    r`Continuity: $A_1 v_1 = A_2 v_2 \Rightarrow v_2 = \dfrac{10 \times 2}{4} = 5\ \text{m s}^{-1}$.`, { difficulty: 'easy' }),

  // Heat and Thermodynamics
  mcq('heat-and-thermodynamics', r`The efficiency of a Carnot engine working between $500\ \text{K}$ and $300\ \text{K}$ is`,
    [r`$40\%$`, r`$60\%$`, r`$25\%$`, r`$67\%$`], 'A',
    r`$\eta = 1 - \dfrac{T_C}{T_H} = 1 - \dfrac{300}{500} = 0.4 = 40\%$.`, 'easy'),
  num('heat-and-thermodynamics', r`Two moles of an ideal monoatomic gas are heated at constant volume through $10\ \text{K}$. The heat supplied (in J) is ______. (Take $R = 8.3\ \text{J mol}^{-1}\text{K}^{-1}$.)`, 249,
    r`$Q = nC_v\Delta T = 2 \times \tfrac32 R \times 10 = 30R = 30 \times 8.3 = 249\ \text{J}$.`, { tol: 1 }),

  // Simple Harmonic Motion
  mcq('simple-harmonic-motion', r`The time period of a simple pendulum of length $1\ \text{m}$ at a place where $g = \pi^2\ \text{m s}^{-2}$ is`,
    [r`$1\ \text{s}$`, r`$2\ \text{s}$`, r`$\pi\ \text{s}$`, r`$4\ \text{s}$`], 'B',
    r`$T = 2\pi\sqrt{L/g} = 2\pi\sqrt{1/\pi^2} = 2\ \text{s}$.`, 'easy'),
  num('simple-harmonic-motion', r`A particle performs SHM with amplitude $0.1\ \text{m}$ and angular frequency $10\ \text{rad s}^{-1}$. Its maximum speed (in $\text{m s}^{-1}$) is ______.`, 1,
    r`$v_{\max} = A\omega = 0.1 \times 10 = 1\ \text{m s}^{-1}$.`, { difficulty: 'easy' }),

  // Waves
  mcq('waves', r`A string $1\ \text{m}$ long is fixed at both ends. Transverse waves travel on it at $200\ \text{m s}^{-1}$. Its fundamental frequency is`,
    [r`$50\ \text{Hz}$`, r`$100\ \text{Hz}$`, r`$200\ \text{Hz}$`, r`$400\ \text{Hz}$`], 'B',
    r`Fundamental: $\lambda = 2L = 2\ \text{m}$, so $f = v/\lambda = 200/2 = 100\ \text{Hz}$.`),
  num('waves', r`A pipe closed at one end is $50\ \text{cm}$ long. Taking the speed of sound as $340\ \text{m s}^{-1}$ and neglecting end correction, its fundamental frequency (in Hz) is ______.`, 170,
    r`For a closed pipe $\lambda = 4L = 2\ \text{m}$, so $f = 340/2 = 170\ \text{Hz}$.`),

  // Electrostatics
  mcq('electrostatics', r`Two point charges repel each other with a force $F$. If the distance between them is halved, the force becomes`,
    [r`$F/4$`, r`$2F$`, r`$4F$`, r`$F/2$`], 'C',
    r`Coulomb's law: $F \propto 1/r^2$; halving $r$ gives $4F$.`, 'easy'),
  num('electrostatics', r`The electric potential (in kV) at a distance of $30\ \text{cm}$ from a point charge of $1\ \mu\text{C}$ in vacuum is ______. (Take $\dfrac{1}{4\pi\varepsilon_0} = 9 \times 10^9\ \text{N m}^2\text{C}^{-2}$.)`, 30,
    r`$V = \dfrac{kq}{r} = \dfrac{9\times10^9 \times 10^{-6}}{0.3} = 3 \times 10^4\ \text{V} = 30\ \text{kV}$.`),

  // Capacitor
  mcq('capacitor', r`A parallel-plate capacitor of capacitance $C$ is completely filled with a dielectric of dielectric constant $4$. Its new capacitance is`,
    [r`$C/4$`, r`$2C$`, r`$4C$`, r`$C$`], 'C',
    r`$C = \dfrac{K\varepsilon_0 A}{d}$ scales linearly with $K$: the new capacitance is $4C$.`, 'easy'),
  num('capacitor', r`A $10\ \mu\text{F}$ capacitor is charged to $100\ \text{V}$. The energy stored (in J) is ______.`, 0.05,
    r`$U = \tfrac12 CV^2 = \tfrac12 (10^{-5})(10^4) = 0.05\ \text{J}$.`),

  // Current Electricity
  mcq('current-electricity', r`A uniform wire of resistance $R$ is stretched to twice its length (volume unchanged). Its new resistance is`,
    [r`$2R$`, r`$4R$`, r`$R/2$`, r`$R$`], 'B',
    r`With constant volume, $A$ halves when $L$ doubles. $R = \rho L/A$ becomes $\rho(2L)/(A/2) = 4R$.`),
  num('current-electricity', r`A cell of emf $2\ \text{V}$ and internal resistance $0.5\ \Omega$ is connected to an external resistance of $3.5\ \Omega$. The terminal potential difference (in V) is ______.`, 1.75,
    r`$I = \dfrac{E}{R + r} = \dfrac{2}{4} = 0.5\ \text{A}$. $V = E - Ir = 2 - 0.25 = 1.75\ \text{V}$.`),

  // Magnetic Effects of Current
  mcq('magnetic-effects-of-current', r`Two long parallel wires carry currents in the same direction. The force between them is`,
    ['attractive', 'repulsive', 'zero', 'along the length of the wires'], 'A',
    r`Each wire lies in the magnetic field of the other; for parallel currents $\vec F = I\vec L \times \vec B$ points towards the other wire, so they attract.`, 'easy'),
  num('magnetic-effects-of-current', r`A long solenoid has $1000$ turns per metre and carries a current of $2\ \text{A}$. The magnetic field inside it, in mT, is ______. (Take $\mu_0 = 4\pi \times 10^{-7}\ \text{T m A}^{-1}$; answer to two decimal places.)`, 2.51,
    r`$B = \mu_0 n I = 4\pi\times10^{-7} \times 1000 \times 2 = 8\pi \times 10^{-4}\ \text{T} \approx 2.51 \times 10^{-3}\ \text{T} = 2.51\ \text{mT}$.`, { tol: 0.02 }),

  // Magnetic Properties of Matter
  mcq('magnetic-properties-of-matter', r`The magnetic susceptibility of a diamagnetic substance is`,
    ['small and positive', 'small and negative', 'large and positive', 'exactly zero'], 'B',
    r`Diamagnetic materials are weakly magnetised opposite to the applied field, so $\chi$ is small and negative (about $-10^{-5}$).`, 'easy'),
  mcq('magnetic-properties-of-matter', r`A paramagnetic salt obeying Curie's law has susceptibility $1.2 \times 10^{-5}$ at $300\ \text{K}$. Its susceptibility at $600\ \text{K}$ is`,
    [r`$2.4 \times 10^{-5}$`, r`$1.2 \times 10^{-5}$`, r`$0.6 \times 10^{-5}$`, r`$0.3 \times 10^{-5}$`], 'C',
    r`Curie's law: $\chi \propto 1/T$. Doubling $T$ halves $\chi$: $0.6 \times 10^{-5}$.`),

  // Electromagnetic Induction
  num('electromagnetic-induction', r`A conducting rod of length $0.5\ \text{m}$ moves at $4\ \text{m s}^{-1}$ perpendicular to a uniform magnetic field of $0.2\ \text{T}$, with the rod, velocity and field mutually perpendicular. The motional emf (in V) is ______.`, 0.4,
    r`$\varepsilon = B\ell v = 0.2 \times 0.5 \times 4 = 0.4\ \text{V}$.`, { difficulty: 'easy' }),
  mcq('electromagnetic-induction', r`Lenz's law is a consequence of the conservation of`,
    ['charge', 'momentum', 'energy', 'magnetic flux'], 'C',
    r`If the induced current aided the change that caused it, energy would be created without work being done. Opposing the change ensures mechanical work is converted into electrical energy, conserving energy.`, 'easy'),

  // Alternating Current
  mcq('alternating-current', r`In an AC circuit containing only an ideal inductor, the current`,
    [r`is in phase with the voltage`, r`leads the voltage by $\pi/2$`, r`lags the voltage by $\pi/2$`, r`lags the voltage by $\pi$`], 'C',
    r`For $v = L\,di/dt$ with $v = V_0\sin\omega t$, integration gives $i = -\dfrac{V_0}{\omega L}\cos\omega t$, which lags $v$ by $\pi/2$.`, 'easy'),
  int('alternating-current', r`An LC circuit has $L = 0.1\ \text{H}$ and $C = 10\ \mu\text{F}$. Its resonant angular frequency (in $\text{rad s}^{-1}$) is ______.`, 1000,
    r`$\omega_0 = \dfrac{1}{\sqrt{LC}} = \dfrac{1}{\sqrt{0.1 \times 10^{-5}}} = \dfrac{1}{10^{-3}} = 1000\ \text{rad s}^{-1}$.`),

  // Electromagnetic Waves
  mcq('electromagnetic-waves', r`Which sequence lists electromagnetic radiations in order of increasing wavelength?`,
    ['X-rays, gamma rays, ultraviolet, visible', 'gamma rays, X-rays, ultraviolet, visible', 'visible, ultraviolet, X-rays, gamma rays', 'ultraviolet, gamma rays, visible, X-rays'], 'B',
    r`Wavelength increases from gamma rays ($<10^{-12}$ m) to X-rays, then ultraviolet, then visible light.`, 'easy'),
  num('electromagnetic-waves', r`In a plane electromagnetic wave in vacuum, the amplitude of the magnetic field is $2 \times 10^{-8}\ \text{T}$. The amplitude of the electric field (in $\text{V m}^{-1}$) is ______.`, 6,
    r`$E_0 = cB_0 = 3\times10^8 \times 2\times10^{-8} = 6\ \text{V m}^{-1}$.`, { difficulty: 'easy' }),

  // Geometrical Optics
  mcq('geometrical-optics', r`The critical angle for light going from a medium of refractive index $\sqrt{2}$ into air is`,
    [r`$30^\circ$`, r`$45^\circ$`, r`$60^\circ$`, r`$90^\circ$`], 'B',
    r`$\sin C = \dfrac{1}{n} = \dfrac{1}{\sqrt2} \Rightarrow C = 45^\circ$.`, 'easy'),
  num('geometrical-optics', r`An object is placed $30\ \text{cm}$ in front of a concave mirror of focal length $10\ \text{cm}$. The distance (in cm) of the image from the mirror is ______.`, 15,
    r`With $u = -30$, $f = -10$: $\dfrac1v = \dfrac1f - \dfrac1u = -\dfrac1{10} + \dfrac1{30} = -\dfrac{2}{30}$, so $v = -15\ \text{cm}$ (real image $15\ \text{cm}$ in front of the mirror).`),

  // Wave Optics
  mcq('wave-optics', r`In single-slit diffraction with slit width $a$ and wavelength $\lambda$, the first minimum occurs at angle $\theta$ given by`,
    [r`$a\sin\theta = \lambda/2$`, r`$a\sin\theta = \lambda$`, r`$a\sin\theta = 3\lambda/2$`, r`$a\sin\theta = 2\lambda$`], 'B',
    r`Dividing the slit into two halves, light from corresponding points cancels when the path difference across the full slit is $\lambda$: $a\sin\theta = \lambda$.`),
  mcq('wave-optics', r`Unpolarised light of intensity $I_0$ passes through two polarisers whose transmission axes are at $60^\circ$ to each other. The transmitted intensity is`,
    [r`$I_0/2$`, r`$I_0/4$`, r`$I_0/8$`, r`$3I_0/8$`], 'C',
    r`The first polariser passes $I_0/2$. By Malus's law the second passes $\dfrac{I_0}{2}\cos^2 60^\circ = \dfrac{I_0}{2}\cdot\dfrac14 = \dfrac{I_0}{8}$.`),

  // Dual Nature of Radiation
  num('dual-nature-of-radiation', r`Photons of energy $5\ \text{eV}$ fall on a metal of work function $2\ \text{eV}$. The stopping potential (in V) is ______.`, 3,
    r`$K_{\max} = h\nu - \phi = 5 - 2 = 3\ \text{eV}$, so $V_0 = K_{\max}/e = 3\ \text{V}$.`, { difficulty: 'easy' }),
  num('dual-nature-of-radiation', r`An electron is accelerated from rest through $100\ \text{V}$. Its de Broglie wavelength, in ångström (to two decimal places), is ______.`, 1.23,
    r`For electrons $\lambda = \dfrac{12.27}{\sqrt V}\ \text{Å} = \dfrac{12.27}{10} \approx 1.23\ \text{Å}$.`, { tol: 0.02 }),

  // Atoms and Nuclei
  mcq('atoms-and-nuclei', r`A radioactive sample has a half-life of $10$ days. The fraction remaining undecayed after $30$ days is`,
    [r`$\tfrac13$`, r`$\tfrac14$`, r`$\tfrac18$`, r`$\tfrac1{16}$`], 'C',
    r`$30$ days $= 3$ half-lives: $N/N_0 = (1/2)^3 = 1/8$.`, 'easy'),
  mcq('atoms-and-nuclei', r`The energy of the electron in the $n = 2$ state of a hydrogen atom is`,
    [r`$-13.6\ \text{eV}$`, r`$-3.4\ \text{eV}$`, r`$-1.51\ \text{eV}$`, r`$-6.8\ \text{eV}$`], 'B',
    r`$E_n = -\dfrac{13.6}{n^2}\ \text{eV} = -\dfrac{13.6}{4} = -3.4\ \text{eV}$.`, 'easy'),

  // Semiconductor
  mcq('electronic-devices', r`A logic gate gives output $1$ only when both inputs are $0$. The gate is`,
    ['AND', 'OR', 'NAND', 'NOR'], 'D',
    r`NOR = NOT(OR). OR is $0$ only when both inputs are $0$, so NOR is $1$ only in that case.`, 'easy'),
  mcq('electronic-devices', r`When pure silicon is doped with a pentavalent impurity such as phosphorus, the majority charge carriers are`,
    ['holes', 'electrons', 'positive ions', 'negative ions'], 'B',
    r`Each pentavalent atom donates a fifth valence electron, giving an n-type semiconductor whose majority carriers are electrons.`, 'easy'),
];
