// Mirrors ResearchQuery, ResearchTopics, and ResearchVocabulary in the SOMA Swift app.
export const BASE_RESEARCH_VOCABULARY = `
adaptation aerobic after alertness altitude anemia appetite astronaut astronauts atrophy
balance before blood blurred body bone breathing capacity cardiovascular cardiac circadian
cognition concentration congestion coordination cough crew decompression dehydration density
disorientation dizziness dry dust ear edema equilibrium exercise exposure eye fatigue flight
fluid fracture gas gravity headache hearing heart human hydration hypobaric hypoxia
inflight injury insomnia intolerance irregular landing loss low lunar metabolism microgravity
mobility motion muscle musculoskeletal nausea neuro ocular oxygen pain palpitations performance
physical postflight postural preflight pressure radiation readaptation recovery reentry
regolith respiratory rhythm sickness sleep somnolence space spaceflight strain strength
stress surface swelling symptoms syndrome temperature thermal tolerance training transition
vascular vertigo vestibular vision visual vomiting walking weakness workload
associated and changes hypoxic nutrition orthostatic outflow rapid
rate rest standing sudden syncope tachycardia ventilation weightlessness
`.trim().split(/\s+/);

export const URGENCY_TERMS = ["emergency", "urgent"];

export const FALLBACK_TOPICS = [
  {
    aliases: ["dizzy", "dizziness", "nausea", "motion sickness"],
    terms: ["space", "motion", "sickness", "dizziness", "vestibular", "balance"],
  },
  {
    aliases: ["blood pressure", "fainting", "palpitations"],
    terms: ["orthostatic", "intolerance", "blood", "pressure", "cardiovascular", "adaptation"],
  },
  {
    aliases: ["sleep", "fatigue"],
    terms: ["sleep", "loss", "circadian", "rhythm", "fatigue", "alertness"],
  },
  {
    aliases: ["blurred vision"],
    terms: ["visual", "changes", "spaceflight", "associated", "neuro", "ocular", "syndrome"],
  },
  {
    aliases: ["hypoxia", "oxygen", "decompression", "shortness of breath"],
    terms: ["hypoxia", "oxygen", "decompression", "human", "spaceflight"],
  },
  {
    aliases: ["muscle atrophy", "bone loss"],
    terms: ["muscle", "atrophy", "and", "bone", "density", "after", "spaceflight"],
  },
  {
    aliases: ["dehydration", "hydration", "nutrition", "appetite"],
    terms: ["hydration", "nutrition", "fluid", "balance", "human", "spaceflight"],
  },
  {
    aliases: ["lunar dust"],
    terms: ["lunar", "dust", "respiratory", "and", "ocular", "exposure"],
  },
];

export const RESEARCH_CATALOG = [
  {
    aliases: ["prebreathe", "pre breathe", "prebreathing", "pre breathing"],
    terms: ["eva", "prebreathe", "decompression"],
  },
  {
    aliases: ["resting in suit"],
    terms: ["resting", "in", "suit", "prebreathe"],
  },
  {
    aliases: ["campout", "camp out", "staged denitrogenation"],
    terms: ["campout", "eva", "prebreathe"],
  },
  {
    aliases: ["isle", "in suit light exercise"],
    terms: ["isle", "eva", "prebreathe"],
  },
  {
    aliases: ["shuttle staged protocol"],
    terms: ["shuttle", "staged", "protocol", "prebreathe"],
  },
  {
    aliases: ["hypoxia treatment"],
    terms: ["hypoxia", "treatment", "capability"],
  },
  {
    aliases: ["dcs treatment", "decompression sickness treatment"],
    terms: ["dcs", "treatment", "capability"],
  },
  {
    aliases: ["eclss", "pulse oximetry"],
    terms: ["eclss", "pulse", "oximetry", "hypoxia"],
  },
  {
    aliases: ["fluid loading", "fluid load"],
    terms: ["fluid", "loading", "orthostatic", "reentry"],
  },
  {
    aliases: ["compression garment", "compression garments"],
    terms: ["compression", "garments", "orthostatic"],
  },
  {
    aliases: ["lbnp", "lower body negative pressure"],
    terms: ["lbnp", "lower", "body", "negative", "pressure"],
  },
  {
    aliases: ["orthostatic cooling", "cooling countermeasure"],
    terms: ["orthostatic", "cooling", "countermeasures"],
  },
  {
    aliases: ["thigh cuffs"],
    terms: ["thigh", "cuffs", "cardiovascular"],
  },
  {
    aliases: ["targeted ultrasound surveillance"],
    terms: ["targeted", "ultrasound", "surveillance"],
  },
  {
    aliases: ["orthostatic tolerance test"],
    terms: ["orthostatic", "tolerance", "test"],
  },
  {
    aliases: ["radiation shielding", "radiation countermeasures"],
    terms: ["radiation", "shielding", "countermeasures"],
  },
  {
    aliases: ["bls", "acls", "crew medical officer"],
    terms: ["bls", "acls", "crew", "medical", "officer"],
  },
  {
    aliases: ["renal stones screening", "renal stone screening"],
    terms: ["renal", "stones", "ultrasound", "screening"],
  },
  {
    aliases: ["renal stones clinical practice guideline", "guideline for the monitoring and management of renal stones"],
    terms: ["renal", "stones", "clinical", "practice", "guideline"],
  },
  {
    aliases: ["sensorimotor guidelines"],
    terms: ["sensorimotor", "guidelines", "conditioning"],
  },
  {
    aliases: ["balance rehabilitation"],
    terms: ["balance", "rehabilitation", "readaptation"],
  },
  {
    aliases: ["dynamic posturography"],
    terms: ["dynamic", "posturography", "balance"],
  },
  {
    aliases: ["functional mobility test"],
    terms: ["functional", "mobility", "test", "landing"],
  },
  {
    aliases: ["light exposure", "circadian phase shifting", "solid state light assemblies", "ssla"],
    terms: ["light", "exposure", "circadian", "phase", "shifting"],
  },
  {
    aliases: ["work hour guidelines", "work hours"],
    terms: ["work", "hour", "guidelines", "fatigue"],
  },
  {
    aliases: ["actigraphy"],
    terms: ["actigraphy", "sleep", "monitoring"],
  },
  {
    aliases: ["dxa", "qct", "bone densitometry"],
    terms: ["dxa", "qct", "bone", "densitometry"],
  },
  {
    aliases: ["ared", "advanced resistive exercise device", "resistive exercise"],
    terms: ["ared", "resistive", "exercise", "bone"],
  },
  {
    aliases: ["bisphosphonate flight investigation", "bisphosphonate bone flight study"],
    terms: ["bisphosphonate", "bone", "flight", "study"],
  },
  {
    aliases: ["cycle ergometer", "aerobic capacity test"],
    terms: ["cycle", "ergometer", "aerobic", "capacity", "test"],
  },
  {
    aliases: ["treadmill", "exercise prescription"],
    terms: ["treadmill", "aerobic", "exercise", "prescription"],
  },
  {
    aliases: ["cone agility test"],
    terms: ["cone", "agility", "test", "performance"],
  },
  {
    aliases: ["ventilatory threshold"],
    terms: ["ventilatory", "threshold", "aerobic", "capacity"],
  },
  {
    aliases: ["optical coherence tomography", "oct"],
    terms: ["oct", "optical", "coherence", "tomography", "sans"],
  },
  {
    aliases: ["fundoscopy", "fundus exam"],
    terms: ["fundoscopy", "retina", "sans"],
  },
  {
    aliases: ["sans countermeasures", "mechanical sans countermeasures"],
    terms: ["mechanical", "sans", "countermeasures"],
  },
  {
    aliases: ["fluid intake", "hydration monitoring"],
    terms: ["fluid", "intake", "hydration", "homeostasis"],
  },
  {
    aliases: ["urinary calcium"],
    terms: ["urinary", "calcium", "bone", "nutrition"],
  },
  {
    aliases: ["nutritional countermeasures"],
    terms: ["nutritional", "countermeasures", "bone", "loss"],
  },
  {
    aliases: ["dust control", "lunar dust mitigation"],
    terms: ["lunar", "dust", "control", "apollo"],
  },
  {
    aliases: ["respiratory protection"],
    terms: ["lunar", "dust", "respiratory", "protection"],
  },
  {
    aliases: ["wake eeg"],
    terms: ["wake", "eeg", "sleep", "recordings"],
  },
  {
    aliases: ["circadian sleep countermeasures"],
    terms: ["circadian", "sleep", "countermeasures", "treatments"],
  },
  {
    aliases: ["sirius 19"],
    terms: ["sirius", "sleep", "protocol"],
  },
  {
    aliases: ["cognition battery"],
    terms: ["cognition", "battery", "cognitive", "performance"],
  },
  {
    aliases: ["sit to stand", "sit to stand test"],
    terms: ["sit", "to", "stand", "landing"],
  },
  {
    aliases: ["walk and turn", "tandem walk"],
    terms: ["walk", "and", "turn", "tandem", "walk"],
  },
  {
    aliases: ["prisma cardiovascular"],
    terms: ["systematic", "review", "prisma", "cardiovascular"],
  },
  {
    aliases: ["orthostatic intolerance countermeasures"],
    terms: ["orthostatic", "intolerance", "autonomic", "countermeasures"],
  },
  {
    aliases: ["radiation injuries prevention"],
    terms: ["radiation", "injuries", "prevention", "space"],
  },
  {
    aliases: ["tilt table"],
    terms: ["tilt", "table", "visual", "microgravity"],
  },
  {
    aliases: ["sans management"],
    terms: ["neuro", "ocular", "syndrome", "management"],
  },
  {
    aliases: ["bone density meta analysis"],
    terms: ["bone", "density", "meta", "analysis", "measurement"],
  },
  {
    aliases: ["hr pqct", "hrpqct"],
    terms: ["hr", "pqct", "bone", "microarchitecture"],
  },
  {
    aliases: ["bone marrow magnetic resonance imaging"],
    terms: ["bone", "marrow", "magnetic", "resonance", "imaging"],
  },
  {
    aliases: ["inspiration4 serum", "serum metabolic panel"],
    terms: ["inspiration4", "serum", "metabolic", "panel"],
  },
  {
    aliases: ["inspiration4 urine", "urine inflammation panel"],
    terms: ["inspiration4", "urine", "inflammation", "panel"],
  },
  {
    aliases: ["bed rest exercise training"],
    terms: ["bed", "rest", "exercise", "mitochondrial"],
  },
];
