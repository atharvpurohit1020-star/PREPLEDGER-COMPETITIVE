import { builder, r } from './helpers';

const { mcq, num, int } = builder({ exam: 'neet', subject: 'biology', prefix: 'prac1.neet.bio' });

export const NEET_BIOLOGY = [
  // The Living World
  mcq('the-living-world', 'The system of binomial nomenclature was introduced by',
    ['Charles Darwin', 'Carolus Linnaeus', 'R.H. Whittaker', 'Ernst Mayr'], 'B',
    'Carolus Linnaeus popularised naming each species with two words — genus and specific epithet — in *Species Plantarum* (1753).', 'easy'),
  mcq('the-living-world', 'Which taxonomic category lies between order and genus?',
    ['Class', 'Family', 'Phylum', 'Species'], 'B',
    'The hierarchy is kingdom → phylum/division → class → order → **family** → genus → species.', 'easy'),

  // Biological Classification
  mcq('biological-classification', 'The five-kingdom system of classification was proposed by',
    ['Linnaeus', 'Haeckel', 'R.H. Whittaker', 'Copeland'], 'C',
    'R.H. Whittaker (1969) proposed Monera, Protista, Fungi, Plantae and Animalia, based on cell structure, body organisation, nutrition, reproduction and phylogeny.', 'easy'),
  mcq('biological-classification', 'The genetic material of tobacco mosaic virus (TMV) is',
    ['double-stranded DNA', 'single-stranded DNA', 'single-stranded RNA', 'double-stranded RNA'], 'C',
    'Plant viruses such as TMV generally carry single-stranded RNA inside a protein coat.'),

  // Plant Kingdom
  mcq('plant-kingdom', 'The dominant phase in the life cycle of a moss is the',
    ['sporophyte', 'gametophyte', 'protonema only', 'zygote'], 'B',
    'In bryophytes the haploid gametophyte is the free-living, dominant phase; the sporophyte stays attached to it and depends on it.', 'easy'),
  mcq('plant-kingdom', 'Which group is called the "amphibians of the plant kingdom"?',
    ['Algae', 'Bryophytes', 'Pteridophytes', 'Gymnosperms'], 'B',
    'Bryophytes live on land but need water for the swimming male gametes to reach the egg, hence the name.', 'easy'),

  // Animal Kingdom
  mcq('animal-kingdom', 'A water vascular system is characteristic of',
    ['Porifera', 'Cnidaria', 'Echinodermata', 'Mollusca'], 'C',
    'Echinoderms (starfish, sea urchins) use a water vascular system for locomotion, food capture and respiration.', 'easy'),
  mcq('animal-kingdom', 'Cnidoblasts (stinging cells) are found in',
    ['sponges', 'jellyfish and Hydra', 'flatworms', 'roundworms'], 'B',
    'Cnidoblasts, used for anchorage, defence and prey capture, are characteristic of phylum Cnidaria (e.g. Hydra, jellyfish).', 'easy'),

  // Morphology of Flowering Plants
  mcq('morphology-of-flowering-plants', 'The type of placentation seen in pea is',
    ['axile', 'marginal', 'parietal', 'free central'], 'B',
    'In pea the ovary is one-chambered and ovules are borne along the ventral suture in two rows: marginal placentation.', 'easy'),
  mcq('morphology-of-flowering-plants', 'A potato tuber is a modified',
    ['root', 'stem', 'leaf', 'fruit'], 'B',
    'Potato "eyes" are nodes with axillary buds, which shows the tuber is an underground stem modified for storage.', 'easy'),

  // Anatomy of Flowering Plants
  mcq('anatomy-of-flowering-plants', 'In a monocot stem the vascular bundles are',
    ['open and arranged in a ring', 'closed and scattered', 'radial', 'open and scattered'], 'B',
    'Monocot stems have many conjoint, collateral, closed bundles (no cambium) scattered through the ground tissue.', 'easy'),
  mcq('anatomy-of-flowering-plants', 'Casparian strips are present in the',
    ['epidermis', 'cortex', 'endodermis', 'pericycle'], 'C',
    'Endodermal cells have suberin-rich Casparian strips in their radial and tangential walls, which block apoplastic flow of water into the stele.'),

  // Structural Organisation in Animals
  mcq('structural-organisation-in-animals', 'The inner lining of blood vessels (endothelium) is made of',
    ['simple squamous epithelium', 'simple columnar epithelium', 'stratified squamous epithelium', 'cuboidal epithelium'], 'A',
    'A single layer of flat cells allows diffusion and forms the endothelium of blood vessels and the alveolar walls.', 'easy'),
  mcq('structural-organisation-in-animals', 'The heart of a frog has',
    ['two chambers', 'three chambers', 'four chambers', 'four chambers with an incomplete septum'], 'B',
    'Amphibians such as the frog have two atria and one ventricle — a three-chambered heart.', 'easy'),

  // Cell: The Unit of Life
  mcq('cell-the-unit-of-life', 'The fluid mosaic model of the plasma membrane was proposed by',
    ['Robert Hooke', 'Schleiden and Schwann', 'Singer and Nicolson', 'Rudolf Virchow'], 'C',
    'Singer and Nicolson (1972) described the membrane as a fluid lipid bilayer with proteins embedded in it.', 'easy'),
  mcq('cell-the-unit-of-life', '70S ribosomes are found in',
    ['the cytoplasm of eukaryotic cells', 'prokaryotic cells', 'the nucleus', 'the Golgi apparatus'], 'B',
    'Prokaryotes have 70S ribosomes (50S + 30S). Eukaryotic cytoplasmic ribosomes are 80S, although mitochondria and chloroplasts also contain 70S ribosomes.'),

  // Biomolecules
  mcq('biomolecules', 'The most abundant protein in the whole biosphere is',
    ['collagen', 'haemoglobin', 'RuBisCO', 'insulin'], 'C',
    'RuBisCO, the enzyme that fixes CO₂ in the Calvin cycle, is the most abundant protein in the biosphere. Collagen is the most abundant protein in animals.'),
  mcq('biomolecules', 'Malonate inhibits succinic dehydrogenase by',
    ['non-competitive inhibition', 'competitive inhibition', 'denaturing the enzyme', 'allosteric activation'], 'B',
    'Malonate closely resembles the substrate succinate and competes for the active site — a classic competitive inhibitor.'),

  // Cell Cycle and Cell Division
  mcq('cell-cycle-and-cell-division', 'Crossing over takes place during',
    ['leptotene', 'zygotene', 'pachytene', 'diakinesis'], 'C',
    'Crossing over, the exchange of segments between non-sister chromatids of homologous chromosomes, occurs at pachytene of prophase I.'),
  int('cell-cycle-and-cell-division', 'A human cell (2n = 46) undergoes meiosis I. The number of chromosomes in each daughter cell is ______.', 23,
    'Meiosis I is reductional: homologous chromosomes separate, so each daughter cell has n = 23 chromosomes, each still made of two chromatids.', 'easy'),

  // Photosynthesis
  mcq('photosynthesis-in-higher-plants', 'Photolysis of water is associated with',
    ['photosystem I', 'photosystem II', 'the Calvin cycle', 'glycolysis'], 'B',
    'The water-splitting complex is on the inner (lumen) side of the thylakoid and linked to PS II, which supplies electrons to replace those lost by P680.'),
  mcq('photosynthesis-in-higher-plants', 'To fix one molecule of CO₂ in the Calvin cycle, the requirement is',
    ['2 ATP and 2 NADPH', '3 ATP and 2 NADPH', '2 ATP and 3 NADPH', '3 ATP and 3 NADPH'], 'B',
    'Per CO₂ fixed, the cycle uses 3 ATP (2 for reduction, 1 for RuBP regeneration) and 2 NADPH. Making one glucose (6 CO₂) uses 18 ATP and 12 NADPH.'),

  // Respiration in Plants
  int('respiration-in-plants', 'The net gain of ATP molecules by substrate-level phosphorylation in glycolysis, per molecule of glucose, is ______.', 2,
    'Glycolysis makes 4 ATP but uses 2 in the preparatory steps: net gain 2 ATP (plus 2 NADH).', 'easy'),
  mcq('respiration-in-plants', 'The Krebs cycle takes place in the',
    ['cytoplasm', 'mitochondrial matrix', 'inner mitochondrial membrane', 'chloroplast stroma'], 'B',
    'The TCA (Krebs) cycle enzymes are in the mitochondrial matrix (except succinate dehydrogenase, which is bound to the inner membrane).', 'easy'),

  // Plant Growth and Development
  mcq('plant-growth-and-development', 'Apical dominance in plants is caused by',
    ['gibberellins', 'cytokinins', 'auxins', 'abscisic acid'], 'C',
    'Auxin produced at the shoot apex suppresses the growth of lateral buds. Removing the tip (decapitation) releases them.', 'easy'),
  mcq('plant-growth-and-development', 'Bolting (rapid internode elongation before flowering) in rosette plants is induced by',
    ['auxins', 'gibberellins', 'ethylene', 'abscisic acid'], 'B',
    'Gibberellins promote internode elongation and cause bolting in plants such as cabbage and beet.'),

  // Breathing and Exchange of Gases
  mcq('breathing-and-exchange-of-gases', 'The tidal volume of a healthy adult human is about',
    ['150 mL', '500 mL', '1100 mL', '3000 mL'], 'B',
    'Tidal volume — air inspired or expired in a normal breath — is about 500 mL (6000–8000 mL per minute).', 'easy'),
  mcq('breathing-and-exchange-of-gases', 'Most of the carbon dioxide in blood is transported as',
    ['dissolved CO₂', 'carbaminohaemoglobin', 'bicarbonate ions', 'carbonic acid'], 'C',
    'About 70% of CO₂ travels as bicarbonate formed via carbonic anhydrase in RBCs; about 20–25% as carbaminohaemoglobin and about 7% dissolved.'),

  // Body Fluids and Circulation
  mcq('body-fluids-and-circulation', 'The pacemaker of the human heart is the',
    ['AV node', 'SA node', 'bundle of His', 'Purkinje fibres'], 'B',
    'The sino-atrial node generates the most action potentials per minute (about 70–75) and sets the heart rhythm.', 'easy'),
  mcq('body-fluids-and-circulation', 'A person with blood group O (Rh negative) is called a universal donor because their red cells',
    ['have both A and B antigens', 'have neither A nor B antigens', 'have no antibodies in plasma', 'have the Rh antigen'], 'B',
    'O-negative red cells carry no A, B or Rh antigens, so recipients\' antibodies do not agglutinate them.'),

  // Excretory Products
  mcq('excretory-products-and-their-elimination', 'Antidiuretic hormone (ADH) increases water reabsorption mainly from the',
    ['proximal convoluted tubule', 'descending limb of Henle\'s loop', 'distal convoluted tubule and collecting duct', 'glomerulus'], 'C',
    'ADH (vasopressin) makes the DCT and collecting duct more permeable to water, producing concentrated urine.'),
  mcq('excretory-products-and-their-elimination', 'The counter-current mechanism that helps concentrate urine involves',
    ['the glomerulus and Bowman\'s capsule', 'Henle\'s loop and vasa recta', 'the PCT and DCT', 'the ureter and bladder'], 'B',
    'Opposite flow in the two limbs of Henle\'s loop and in the vasa recta keeps an increasing osmolarity gradient in the medulla.'),

  // Locomotion and Movement
  mcq('locomotion-and-movement', 'The functional unit of contraction in skeletal muscle is the',
    ['myofibril', 'sarcomere', 'muscle fibre', 'fascicle'], 'B',
    'A sarcomere — the segment between two successive Z lines — shortens during contraction as actin slides over myosin.', 'easy'),
  mcq('locomotion-and-movement', 'Gout is caused by accumulation in the joints of',
    ['calcium phosphate', 'uric acid crystals', 'urea', 'lactic acid'], 'B',
    'Gout is joint inflammation due to deposition of uric acid crystals.', 'easy'),

  // Neural Control
  mcq('neural-control-and-coordination', 'Body temperature, hunger and thirst are regulated by the',
    ['cerebellum', 'medulla oblongata', 'hypothalamus', 'pons'], 'C',
    'The hypothalamus contains centres for thermoregulation, hunger and thirst, and links the nervous and endocrine systems.', 'easy'),
  mcq('neural-control-and-coordination', 'Nerve impulses travel faster in myelinated fibres because',
    ['myelin generates action potentials', 'the impulse jumps between nodes of Ranvier', 'myelinated fibres are shorter', 'myelin increases Na⁺ permeability everywhere'], 'B',
    'Myelin insulates the axon, so depolarisation occurs only at the nodes of Ranvier and the impulse "jumps" between them (saltatory conduction).'),

  // Chemical Coordination
  mcq('chemical-coordination-and-integration', 'Insulin is secreted by the',
    ['α-cells of the islets of Langerhans', 'β-cells of the islets of Langerhans', 'adrenal cortex', 'thyroid'], 'B',
    'β-cells secrete insulin, which lowers blood glucose. α-cells secrete glucagon, which raises it.', 'easy'),
  mcq('chemical-coordination-and-integration', 'Enlargement of the thyroid gland (goitre) commonly results from dietary deficiency of',
    ['iron', 'calcium', 'iodine', 'sodium'], 'C',
    'Iodine is needed to make thyroid hormones. Its deficiency causes hypothyroidism and enlargement of the gland.', 'easy'),

  // Sexual Reproduction in Flowering Plants
  mcq('sexual-reproduction-in-flowering-plants', 'The endosperm of angiosperms is typically',
    ['haploid', 'diploid', 'triploid', 'tetraploid'], 'C',
    'Triple fusion of one male gamete with the two polar nuclei forms the triploid primary endosperm nucleus.', 'easy'),
  int('sexual-reproduction-in-flowering-plants', 'The number of nuclei in a mature Polygonum-type embryo sac is ______.', 8,
    'Three mitotic divisions of the functional megaspore give 8 nuclei, organised into 7 cells (egg apparatus, 3 antipodals and a central cell with 2 polar nuclei).', 'easy'),

  // Human Reproduction
  mcq('human-reproduction', 'Fertilisation in humans normally occurs in the',
    ['uterus', 'cervix', 'ampullary region of the fallopian tube', 'isthmus of the fallopian tube'], 'C',
    'The ovum is fertilised in the ampulla of the oviduct, and the zygote moves to the uterus as it divides.', 'easy'),
  mcq('human-reproduction', 'The hormone that maintains the corpus luteum in early pregnancy is',
    ['FSH', 'hCG', 'oxytocin', 'prolactin'], 'B',
    'Human chorionic gonadotropin from the trophoblast/placenta keeps the corpus luteum secreting progesterone.'),

  // Reproductive Health
  mcq('reproductive-health', 'Copper-releasing IUDs (e.g. Cu-T) prevent pregnancy mainly by',
    ['blocking ovulation', 'suppressing sperm motility and fertilising capacity', 'thickening cervical mucus only', 'killing the ovum'], 'B',
    'Cu ions released into the uterus suppress sperm motility and fertilising capacity.'),
  mcq('reproductive-health', 'Medical termination of pregnancy (MTP) is considered relatively safe during the',
    ['first trimester', 'second trimester', 'third trimester', 'entire pregnancy equally'], 'A',
    'MTP is safest in the first trimester (up to about 12 weeks); later terminations are riskier.', 'easy'),

  // Principles of Inheritance
  mcq('principles-of-inheritance-and-variation', 'The phenotypic ratio of a dihybrid test cross ($AaBb \times aabb$) is',
    ['9 : 3 : 3 : 1', '1 : 1 : 1 : 1', '3 : 1', '1 : 2 : 1'], 'B',
    'With independent assortment the dihybrid makes AB, Ab, aB and ab gametes in equal proportion; crossed with ab only, these give four phenotypes in a 1 : 1 : 1 : 1 ratio.'),
  mcq('principles-of-inheritance-and-variation', 'Haemophilia is inherited as a',
    ['autosomal dominant trait', 'autosomal recessive trait', 'sex-linked recessive trait', 'Y-linked trait'], 'C',
    'The defective clotting-factor gene is on the X chromosome and is recessive, so males are affected far more often than females.', 'easy'),

  // Molecular Basis of Inheritance
  mcq('molecular-basis-of-inheritance', 'Okazaki fragments are formed on the',
    ['leading strand', 'lagging strand', 'template strand only', 'mRNA'], 'B',
    'DNA polymerase works only 5′→3′, so the lagging strand is made discontinuously in short Okazaki fragments, later joined by DNA ligase.', 'easy'),
  int('molecular-basis-of-inheritance', 'Of the 64 codons in the genetic code, the number that code for amino acids is ______.', 61,
    'Three codons (UAA, UAG, UGA) are stop codons; the remaining 61 specify amino acids.', 'easy'),

  // Evolution
  mcq('evolution', 'The forelimbs of whales, bats and humans are examples of',
    ['analogous organs showing convergent evolution', 'homologous organs showing divergent evolution', 'vestigial organs', 'atavism'], 'B',
    'They share the same basic bone structure (common ancestry) but serve different functions — homology resulting from divergent evolution.', 'easy'),
  num('evolution', r`In a population in Hardy–Weinberg equilibrium, the frequency of the recessive phenotype ($aa$) is $0.16$. The frequency of heterozygotes ($Aa$) is ______.`, 0.48,
    r`$q^2 = 0.16 \Rightarrow q = 0.4$ and $p = 0.6$. Heterozygote frequency $= 2pq = 2(0.6)(0.4) = 0.48$.`),

  // Human Health and Disease
  mcq('human-health-and-diseases', 'Typhoid fever is caused by',
    ['Plasmodium vivax', 'Salmonella typhi', 'Streptococcus pneumoniae', 'Entamoeba histolytica'], 'B',
    '*Salmonella typhi* causes typhoid, which is confirmed by the Widal test.', 'easy'),
  mcq('human-health-and-diseases', 'HIV mainly infects and destroys',
    ['B lymphocytes', 'helper T lymphocytes', 'red blood cells', 'platelets'], 'B',
    'HIV attacks helper T cells (CD4⁺). Their progressive loss weakens immunity, leading to AIDS.', 'easy'),

  // Microbes in Human Welfare
  mcq('microbes-in-human-welfare', 'Penicillin was discovered by Alexander Fleming from the mould',
    ['Aspergillus niger', 'Penicillium notatum', 'Rhizopus stolonifer', 'Saccharomyces cerevisiae'], 'B',
    'Fleming noticed that *Penicillium notatum* inhibited the growth of *Staphylococcus*; the active substance was penicillin.', 'easy'),
  mcq('microbes-in-human-welfare', 'The main component of biogas, produced by anaerobic bacteria such as methanogens, is',
    ['carbon dioxide', 'methane', 'hydrogen sulphide', 'nitrogen'], 'B',
    'Methanogens such as *Methanobacterium* break down cellulosic material anaerobically to produce mainly methane.', 'easy'),

  // Biotechnology: Principles
  mcq('biotechnology-principles-and-processes', 'Taq polymerase, used in PCR, is obtained from',
    ['Escherichia coli', 'Thermus aquaticus', 'Agrobacterium tumefaciens', 'Bacillus thuringiensis'], 'B',
    'The heat-stable DNA polymerase from the thermophilic bacterium *Thermus aquaticus* survives the high-temperature denaturation steps of PCR.', 'easy'),
  mcq('biotechnology-principles-and-processes', 'Restriction endonucleases cut DNA',
    ['at random sites', 'at specific palindromic recognition sequences', 'only at the ends of the molecule', 'only in RNA–DNA hybrids'], 'B',
    'Each restriction enzyme recognises a specific (usually palindromic) base sequence, e.g. EcoRI cuts at GAATTC.'),

  // Biotechnology: Applications
  mcq('biotechnology-and-its-applications', 'The Bt toxin genes used in insect-resistant crops come from',
    ['Bacillus thuringiensis', 'Bacillus subtilis', 'Thermus aquaticus', 'Agrobacterium rhizogenes'], 'A',
    '*cry* genes from *Bacillus thuringiensis* code for crystal proteins that become toxic in the alkaline insect gut.', 'easy'),
  mcq('biotechnology-and-its-applications', 'Rosie, the first transgenic cow, produced milk enriched with',
    ['human insulin', 'human α-lactalbumin', 'human growth hormone', 'vitamin A'], 'B',
    'Rosie (1997) produced milk containing human α-lactalbumin, making it nutritionally closer to human milk.'),

  // Organisms and Populations
  mcq('organisms-and-populations', 'Population growth under limited resources follows a',
    ['J-shaped exponential curve', 'sigmoid (S-shaped) logistic curve', 'straight line', 'bell-shaped curve'], 'B',
    'With limited resources, growth slows as the population nears the carrying capacity K, giving a sigmoid (Verhulst–Pearl logistic) curve.', 'easy'),
  mcq('organisms-and-populations', 'An interaction in which one species benefits and the other is neither harmed nor benefited is',
    ['mutualism', 'commensalism', 'amensalism', 'parasitism'], 'B',
    'Commensalism (+, 0): e.g. an orchid growing as an epiphyte on a mango branch.', 'easy'),

  // Ecosystem
  mcq('ecosystem', 'Which ecological pyramid is always upright?',
    ['pyramid of numbers', 'pyramid of biomass', 'pyramid of energy', 'none of these'], 'C',
    'Energy is lost at each trophic transfer (only about 10% passes on), so a pyramid of energy can never be inverted.', 'easy'),
  mcq('ecosystem', 'Net primary productivity (NPP) equals',
    ['GPP + respiration losses', 'GPP − respiration losses', 'secondary productivity − GPP', 'GPP × respiration losses'], 'B',
    'NPP is the biomass available to consumers: gross primary productivity minus the producers\' respiratory losses (NPP = GPP − R).', 'easy'),

  // Biodiversity and Conservation
  mcq('biodiversity-and-conservation', 'Of the "evil quartet" of causes of biodiversity loss, the most important is',
    ['over-exploitation', 'alien species invasion', 'habitat loss and fragmentation', 'co-extinction'], 'C',
    'Habitat loss and fragmentation is the most important cause of animal and plant extinctions.', 'easy'),
  mcq('biodiversity-and-conservation', 'Sacred groves are an example of',
    ['ex situ conservation', 'in situ conservation', 'cryopreservation', 'a seed bank'], 'B',
    'Sacred groves protect species in their natural habitat, so they are in situ conservation.', 'easy'),
];
