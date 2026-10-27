import { builder, r } from './helpers';

const { mcq, num, int } = builder({ exam: 'jee-main', subject: 'chemistry', prefix: 'prac1.jm.chem' });

export const JEE_MAIN_CHEMISTRY = [
  // Some Basic Concepts
  mcq('some-basic-concepts-of-chemistry', r`The number of water molecules in $9\ \text{g}$ of water is ($N_A = 6.022 \times 10^{23}$)`,
    [r`$6.022 \times 10^{23}$`, r`$3.011 \times 10^{23}$`, r`$1.806 \times 10^{24}$`, r`$9 \times 10^{23}$`], 'B',
    r`$n = 9/18 = 0.5\ \text{mol}$; molecules $= 0.5 \times 6.022\times10^{23} = 3.011\times10^{23}$.`, 'easy'),
  num('some-basic-concepts-of-chemistry', r`$4.9\ \text{g}$ of $\ce{H2SO4}$ is dissolved in water to make $500\ \text{mL}$ of solution. Its molarity (in $\text{mol L}^{-1}$) is ______. (Molar mass of $\ce{H2SO4}$ = $98\ \text{g mol}^{-1}$)`, 0.1,
    r`$n = 4.9/98 = 0.05\ \text{mol}$; $M = 0.05/0.5 = 0.1\ \text{mol L}^{-1}$.`, { difficulty: 'easy' }),

  // Structure of Atom
  mcq('structure-of-atom', r`Which set of quantum numbers $(n, l, m_l)$ is NOT allowed?`,
    [r`$(2, 1, 0)$`, r`$(3, 2, -2)$`, r`$(2, 2, 1)$`, r`$(4, 0, 0)$`], 'C',
    r`$l$ can take values $0$ to $n-1$. For $n = 2$, $l = 2$ is not allowed.`, 'easy'),
  int('structure-of-atom', r`The number of radial nodes in a $3p$ orbital is ______.`, 1,
    r`Radial nodes $= n - l - 1 = 3 - 1 - 1 = 1$.`, 'easy'),

  // Thermodynamics
  mcq('thermodynamics', r`For a reaction, $\Delta H = -40\ \text{kJ mol}^{-1}$ and $\Delta S = -100\ \text{J K}^{-1}\text{mol}^{-1}$ (both independent of temperature). The reaction is spontaneous`,
    ['at all temperatures', r`only below $400\ \text{K}$`, r`only above $400\ \text{K}$`, 'at no temperature'], 'B',
    r`$\Delta G = \Delta H - T\Delta S = -40000 + 100T < 0$ requires $T < 400\ \text{K}$.`),
  num('thermodynamics', r`For $\ce{N2(g) + 3H2(g) -> 2NH3(g)}$ at $298\ \text{K}$, the value of $\Delta H - \Delta U$ in kJ (to two decimal places) is ______. ($R = 8.314\ \text{J K}^{-1}\text{mol}^{-1}$)`, -4.96,
    r`$\Delta n_g = 2 - 4 = -2$. $\Delta H - \Delta U = \Delta n_g RT = -2 \times 8.314 \times 298 = -4955\ \text{J} \approx -4.96\ \text{kJ}$.`, { tol: 0.03 }),

  // Chemical Equilibrium
  mcq('chemical-equilibrium', r`For the equilibrium $\ce{N2(g) + 3H2(g) <=> 2NH3(g)}$, increasing the total pressure at constant temperature`,
    ['shifts the equilibrium towards ammonia', 'shifts it towards nitrogen and hydrogen', 'has no effect', 'changes the value of $K_p$'], 'A',
    r`The forward reaction reduces the number of gas moles (4 → 2), so by Le Chatelier's principle higher pressure favours $\ce{NH3}$. $K_p$ depends only on temperature.`, 'easy'),
  num('chemical-equilibrium', r`At a certain temperature $K_c = 4$ for $\ce{A + B <=> C + D}$. The value of $K_c$ for $\ce{C + D <=> A + B}$ at the same temperature is ______.`, 0.25,
    r`Reversing a reaction inverts its equilibrium constant: $K_c' = 1/4 = 0.25$.`, { difficulty: 'easy' }),

  // Ionic Equilibrium
  int('ionic-equilibrium', r`The pH of a $0.01\ \text{M}$ aqueous solution of $\ce{NaOH}$ at $25^\circ\text{C}$ is ______.`, 12,
    r`$[\ce{OH-}] = 10^{-2}$, so pOH $= 2$ and pH $= 14 - 2 = 12$.`, 'easy'),
  mcq('ionic-equilibrium', r`A buffer contains equal concentrations of acetic acid ($\text{p}K_a = 4.74$) and sodium acetate. Its pH is`,
    ['2.37', '4.74', '7.00', '9.26'], 'B',
    r`Henderson–Hasselbalch: pH $= \text{p}K_a + \log\dfrac{[\text{salt}]}{[\text{acid}]} = 4.74 + \log 1 = 4.74$.`),

  // Redox Reactions
  mcq('redox-reactions', r`The average oxidation number of sulphur in $\ce{Na2S2O3}$ is`,
    ['+2', '+4', '+6', '0'], 'A',
    r`$2(+1) + 2x + 3(-2) = 0 \Rightarrow 2x = 4 \Rightarrow x = +2$.`),
  int('redox-reactions', r`In acidic medium $\ce{MnO4-}$ is reduced to $\ce{Mn^2+}$. The number of electrons gained per $\ce{MnO4-}$ ion is ______.`, 5,
    r`Mn changes from $+7$ to $+2$: $\ce{MnO4- + 8H+ + 5e- -> Mn^2+ + 4H2O}$.`, 'easy'),

  // Solutions
  mcq('solutions', 'Which of the following is NOT a colligative property?',
    ['Osmotic pressure', 'Elevation of boiling point', 'Depression of freezing point', 'Optical activity'], 'D',
    r`Colligative properties depend only on the number of solute particles. Optical activity depends on the nature (chirality) of the solute.`, 'easy'),
  int('solutions', r`Assuming complete dissociation, the van't Hoff factor $i$ for $\ce{K2SO4}$ in dilute aqueous solution is ______.`, 3,
    r`$\ce{K2SO4 -> 2K+ + SO4^2-}$ gives 3 ions per formula unit, so $i = 3$.`, 'easy'),

  // Electrochemistry
  mcq('electrochemistry', r`The charge required to deposit $1$ mol of copper from $\ce{Cu^2+}$ ions is ($F = 96500\ \text{C mol}^{-1}$)`,
    [r`$96500\ \text{C}$`, r`$48250\ \text{C}$`, r`$193000\ \text{C}$`, r`$289500\ \text{C}$`], 'C',
    r`$\ce{Cu^2+ + 2e- -> Cu}$ needs 2 mol of electrons, i.e. $2F = 193000\ \text{C}$.`, 'easy'),
  num('electrochemistry', r`For a cell reaction with $n = 2$ and $E^\circ_{\text{cell}} = 1.10\ \text{V}$, the standard Gibbs energy change in $\text{kJ mol}^{-1}$ is ______. ($F = 96500\ \text{C mol}^{-1}$)`, -212.3,
    r`$\Delta G^\circ = -nFE^\circ = -2 \times 96500 \times 1.10 = -212300\ \text{J mol}^{-1} = -212.3\ \text{kJ mol}^{-1}$.`, { tol: 0.5 }),

  // Chemical Kinetics
  mcq('chemical-kinetics', 'The units of the rate constant of a second-order reaction are',
    [r`$\text{s}^{-1}$`, r`$\text{mol L}^{-1}\text{s}^{-1}$`, r`$\text{L mol}^{-1}\text{s}^{-1}$`, r`$\text{L}^2\text{mol}^{-2}\text{s}^{-1}$`], 'C',
    r`$k = \dfrac{\text{rate}}{[A]^2} = \dfrac{\text{mol L}^{-1}\text{s}^{-1}}{\text{mol}^2\text{L}^{-2}} = \text{L mol}^{-1}\text{s}^{-1}$.`, 'easy'),
  int('chemical-kinetics', r`The rate of a reaction doubles for every $10\ \text{K}$ rise in temperature. When the temperature rises from $300\ \text{K}$ to $340\ \text{K}$, the rate increases by a factor of ______.`, 16,
    r`Four $10\ \text{K}$ steps: factor $= 2^4 = 16$.`, 'easy'),

  // Periodic Table
  mcq('periodic-table-and-periodicity', 'Which atom has the largest atomic radius?',
    ['Na', 'Mg', 'Al', 'Si'], 'A',
    r`Across a period the effective nuclear charge increases and radius decreases, so Na, the first of the four in period 3, is largest.`, 'easy'),
  mcq('periodic-table-and-periodicity', 'Which element has the highest first ionisation enthalpy?',
    ['B', 'C', 'N', 'O'], 'C',
    r`Nitrogen has a stable half-filled $2p^3$ configuration, so its first ionisation enthalpy exceeds that of oxygen ($2p^4$), which loses a paired electron more easily.`),

  // Chemical Bonding
  mcq('chemical-bonding-and-molecular-structure', r`According to molecular orbital theory, the bond order of the superoxide ion $\ce{O2-}$ is`,
    ['1', '1.5', '2', '2.5'], 'B',
    r`$\ce{O2}$ has bond order 2. Adding one electron to an antibonding $\pi^*$ orbital gives $\ce{O2-}$: $\dfrac{10 - 7}{2} = 1.5$.`),
  mcq('chemical-bonding-and-molecular-structure', 'Which molecule has a zero dipole moment?',
    [r`$\ce{H2O}$`, r`$\ce{NH3}$`, r`$\ce{CO2}$`, r`$\ce{CHCl3}$`], 'C',
    r`$\ce{CO2}$ is linear ($\ce{O=C=O}$): the two equal $\ce{C=O}$ bond dipoles cancel.`, 'easy'),

  // p-Block
  mcq('p-block-elements', 'The noble gas that forms the largest number of chemical compounds is',
    ['He', 'Ne', 'Ar', 'Xe'], 'D',
    r`Xenon has the lowest ionisation enthalpy among these, so it forms fluorides, oxides and oxyfluorides such as $\ce{XeF2}$, $\ce{XeF4}$, $\ce{XeF6}$ and $\ce{XeO3}$.`, 'easy'),
  mcq('p-block-elements', r`The hybridisation of phosphorus in $\ce{PCl5}$ is`,
    [r`$sp^3$`, r`$sp^3d$`, r`$sp^3d^2$`, r`$dsp^2$`], 'B',
    r`Phosphorus forms five $\sigma$ bonds with no lone pair: five electron domains → $sp^3d$, trigonal bipyramidal.`, 'easy'),

  // d and f Block
  num('d-and-f-block-elements', r`The spin-only magnetic moment of $\ce{Fe^3+}$ (in BM, to two decimal places) is ______.`, 5.92,
    r`$\ce{Fe^3+}$ is $3d^5$ with 5 unpaired electrons: $\mu = \sqrt{n(n+2)} = \sqrt{35} \approx 5.92\ \text{BM}$.`, { tol: 0.02 }),
  mcq('d-and-f-block-elements', 'Zirconium and hafnium have almost identical atomic radii. This is mainly due to',
    ['the inert pair effect', 'lanthanoid contraction', 'their similar electronegativities', 'their identical valence configurations'], 'B',
    r`The fourteen poorly shielding $4f$ electrons before hafnium cause the lanthanoid contraction, cancelling the expected size increase from period 5 to period 6.`),

  // Coordination Compounds
  mcq('coordination-compounds', r`The IUPAC name of $\ce{[Co(NH3)6]Cl3}$ is`,
    ['hexaamminecobalt(III) chloride', 'hexaamminecobalt(II) trichloride', 'cobalt hexaammine chloride', 'hexaamminecobaltate(III) chloride'], 'A',
    r`The cation is named first: ligands alphabetically with prefixes (hexaammine), then the metal with its oxidation state ($+3$, from the 3 chloride counter-ions). "-ate" is used only for anionic complexes.`, 'easy'),
  int('coordination-compounds', r`The number of geometrical isomers of square planar $\ce{[Pt(NH3)2Cl2]}$ is ______.`, 2,
    r`The two identical ligands can be adjacent (cis) or opposite (trans): 2 isomers.`, 'easy'),

  // Basics of Organic Chemistry
  mcq('basics-of-organic-chemistry', 'The most stable carbocation among the following is',
    [r`$\ce{CH3+}$`, r`$\ce{CH3CH2+}$`, r`$\ce{(CH3)2CH+}$`, r`$\ce{(CH3)3C+}$`], 'D',
    r`Stability rises with the number of alkyl groups (hyperconjugation and inductive donation): tertiary > secondary > primary > methyl.`, 'easy'),
  int('basics-of-organic-chemistry', r`The total number of $\sigma$ bonds in ethene, $\ce{CH2=CH2}$, is ______.`, 5,
    r`Four $\ce{C-H}$ $\sigma$ bonds plus one $\ce{C-C}$ $\sigma$ bond (the double bond is one $\sigma$ + one $\pi$): 5.`, 'easy'),

  // Isomerism
  int('isomerism', r`The number of chiral carbon atoms in 2,3-dichlorobutane, $\ce{CH3-CHCl-CHCl-CH3}$, is ______.`, 2,
    r`C-2 and C-3 each carry four different groups ($\ce{H}$, $\ce{Cl}$, $\ce{CH3}$ and the rest of the chain), so both are chiral.`),
  mcq('isomerism', 'Which alcohol is optically active?',
    ['propan-2-ol', 'butan-2-ol', 'ethanol', 'propan-1-ol'], 'B',
    r`In butan-2-ol, C-2 bears $\ce{H}$, $\ce{OH}$, $\ce{CH3}$ and $\ce{C2H5}$ — four different groups — so the molecule is chiral.`, 'easy'),

  // Hydrocarbons
  mcq('hydrocarbons', r`Ozonolysis of but-2-ene followed by reductive work-up ($\ce{Zn/H2O}$) gives`,
    ['two molecules of acetaldehyde', 'one molecule of acetone and one of formaldehyde', 'two molecules of formaldehyde', 'propanal and formaldehyde'], 'A',
    r`$\ce{CH3-CH=CH-CH3}$ is cleaved at the double bond, giving two $\ce{CH3CHO}$ molecules.`),
  mcq('hydrocarbons', r`Benzene reacts with $\ce{CH3Cl}$ in the presence of anhydrous $\ce{AlCl3}$ to give`,
    ['chlorobenzene', 'toluene', 'benzyl chloride', 'xylene only'], 'B',
    r`Friedel–Crafts alkylation: $\ce{AlCl3}$ generates an electrophilic methyl species that substitutes on the ring to give $\ce{C6H5CH3}$ (toluene).`, 'easy'),

  // Haloalkanes
  mcq('haloalkanes-and-haloarenes', r`The order of reactivity of alkyl halides towards $S_N1$ reactions is`,
    [r`$1^\circ > 2^\circ > 3^\circ$`, r`$3^\circ > 2^\circ > 1^\circ$`, r`$2^\circ > 3^\circ > 1^\circ$`, r`$1^\circ > 3^\circ > 2^\circ$`], 'B',
    r`$S_N1$ proceeds through a carbocation, so the rate follows carbocation stability: tertiary > secondary > primary.`, 'easy'),
  mcq('haloalkanes-and-haloarenes', r`Chloroform is stored in dark bottles because in air and light it is oxidised to the poisonous gas`,
    ['phosgene', 'chlorine', 'carbon monoxide', 'hydrogen chloride only'], 'A',
    r`$\ce{2CHCl3 + O2 -> 2COCl2 + 2HCl}$: phosgene ($\ce{COCl2}$) forms on exposure to air and light.`, 'easy'),

  // Alcohols, Phenols and Ethers
  mcq('alcohols-phenols-and-ethers', 'Phenol is more acidic than ethanol because',
    ['phenol has a higher molar mass', 'the phenoxide ion is resonance-stabilised', 'ethanol forms hydrogen bonds', 'phenol is more soluble in water'], 'B',
    r`The negative charge of phenoxide is delocalised over the benzene ring; ethoxide has no such stabilisation (and the ethyl group destabilises it inductively).`, 'easy'),
  mcq('alcohols-phenols-and-ethers', r`The product of the reaction of sodium ethoxide with methyl iodide is`,
    ['ethanol', 'methoxyethane', 'ethoxyethane', 'methoxymethane'], 'B',
    r`Williamson synthesis: $\ce{C2H5O- Na+ + CH3I -> C2H5OCH3 + NaI}$, giving methoxyethane.`, 'easy'),

  // Aldehydes, Ketones and Carboxylic Acids
  mcq('aldehydes-ketones-and-carboxylic-acids', 'Which compound undergoes the Cannizzaro reaction?',
    ['acetaldehyde', 'formaldehyde', 'acetone', 'propanal'], 'B',
    r`The Cannizzaro reaction needs an aldehyde without $\alpha$-hydrogens. $\ce{HCHO}$ has none; the others undergo aldol condensation instead.`, 'easy'),
  mcq('aldehydes-ketones-and-carboxylic-acids', 'The strongest acid among the following is',
    ['acetic acid', 'chloroacetic acid', 'dichloroacetic acid', 'trichloroacetic acid'], 'D',
    r`Each electron-withdrawing chlorine stabilises the carboxylate by the $-I$ effect, so acidity rises with the number of Cl atoms.`, 'easy'),

  // Compounds Containing Nitrogen
  mcq('compounds-containing-nitrogen', r`The carbylamine reaction (with $\ce{CHCl3}$ and alcoholic $\ce{KOH}$) is a test for`,
    ['primary amines', 'secondary amines', 'tertiary amines', 'amides'], 'A',
    r`Only primary amines (aliphatic and aromatic) form foul-smelling isocyanides: $\ce{RNH2 + CHCl3 + 3KOH -> RNC + 3KCl + 3H2O}$.`, 'easy'),
  mcq('compounds-containing-nitrogen', 'In aqueous solution, the strongest base among the following is',
    [r`$\ce{NH3}$`, r`$\ce{CH3NH2}$`, r`$\ce{(CH3)2NH}$`, r`$\ce{(CH3)3N}$`], 'C',
    r`In water, basicity balances the inductive effect, solvation of the conjugate acid and steric hindrance. For methylamines the order is $2^\circ > 1^\circ > 3^\circ > \ce{NH3}$.`),

  // Biomolecules
  mcq('biomolecules', 'In sucrose, the glycosidic linkage joins',
    [r`C-1 of $\alpha$-glucose and C-2 of $\beta$-fructose`, r`C-1 of $\alpha$-glucose and C-4 of $\alpha$-glucose`, r`C-1 of $\beta$-galactose and C-4 of glucose`, r`C-1 of $\alpha$-glucose and C-6 of glucose`], 'A',
    r`Sucrose is $\alpha$-D-glucopyranosyl-(1→2)-$\beta$-D-fructofuranoside. Both anomeric carbons are tied up, so sucrose is non-reducing.`),
  mcq('biomolecules', 'Scurvy is caused by deficiency of',
    ['vitamin A', 'vitamin B12', 'vitamin C', 'vitamin D'], 'C',
    r`Vitamin C (ascorbic acid) is needed for collagen synthesis; its deficiency causes scurvy (bleeding gums, poor wound healing).`, 'easy'),

  // Practical Organic Chemistry
  mcq('practical-organic-chemistry', "In Lassaigne's test, a Prussian blue colour indicates the presence of",
    ['nitrogen', 'sulphur', 'chlorine', 'phosphorus'], 'A',
    r`Nitrogen forms $\ce{NaCN}$ on sodium fusion, which gives ferric ferrocyanide (Prussian blue) with $\ce{FeSO4}$ and then $\ce{Fe^3+}$.`, 'easy'),
  mcq('practical-organic-chemistry', "Kjeldahl's method cannot be used to estimate nitrogen in",
    ['urea', 'acetamide', 'pyridine', 'aniline'], 'C',
    r`In Kjeldahl's method nitrogen must be converted to ammonium sulphate. Nitrogen in a ring (pyridine), nitro and azo groups is not converted, so the method fails for them.`),
];
