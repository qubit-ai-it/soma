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

export const URGENCY_TERMS = ["emergencia", "emergencias", "urgente", "urgencias", "emergency", "urgent"];

export const FALLBACK_TOPICS = [
  {
    aliases: ["mareo", "mareos", "mareado", "mareada", "vértigo", "me da vueltas", "todo gira", "náusea", "náuseas", "equilibrio", "dizzy", "dizziness", "nausea", "motion sickness"],
    terms: ["space", "motion", "sickness", "dizziness", "vestibular", "balance"],
  },
  {
    aliases: ["presión arterial", "tensión arterial", "hipotensión", "desmayo", "desmayé", "ortostática", "ortostático", "palpitaciones", "blood pressure", "fainting", "palpitations"],
    terms: ["orthostatic", "intolerance", "blood", "pressure", "cardiovascular", "adaptation"],
  },
  {
    aliases: ["fatiga", "cansancio", "cansado", "cansada", "sueño", "dormir", "insomnio", "somnolencia", "circadiano", "sleep", "fatigue"],
    terms: ["sleep", "loss", "circadian", "rhythm", "fatigue", "alertness"],
  },
  {
    aliases: ["visión borrosa", "vista borrosa", "veo borroso", "veo borrosa", "neuroocular", "neuro ocular", "visión", "blurred vision"],
    terms: ["visual", "changes", "spaceflight", "associated", "neuro", "ocular", "syndrome"],
  },
  {
    aliases: ["hipoxia", "oxígeno", "descompresión", "hypoxia", "oxygen", "decompression", "shortness of breath"],
    terms: ["hypoxia", "oxygen", "decompression", "human", "spaceflight"],
  },
  {
    aliases: ["atrofia", "muscular", "huesos", "ósea", "óseo", "muscle atrophy", "bone loss"],
    terms: ["muscle", "atrophy", "and", "bone", "density", "after", "spaceflight"],
  },
  {
    aliases: ["deshidratación", "hidratación", "nutrición", "apetito", "dehydration", "hydration", "nutrition", "appetite"],
    terms: ["hydration", "nutrition", "fluid", "balance", "human", "spaceflight"],
  },
  {
    aliases: ["polvo lunar", "regolito", "lunar dust"],
    terms: ["lunar", "dust", "respiratory", "and", "ocular", "exposure"],
  },
];

export const RESEARCH_CATALOG = [
  {
    aliases: ["prebreathe", "pre breathe", "prebreathing", "pre breathing", "respiración previa", "preoxigenación antes de una caminata espacial"],
    terms: ["eva", "prebreathe", "decompression"],
  },
  {
    aliases: ["resting in suit", "respiración previa en reposo"],
    terms: ["resting", "in", "suit", "prebreathe"],
  },
  {
    aliases: ["campout", "camp out", "desnitrogenación escalonada", "staged denitrogenation"],
    terms: ["campout", "eva", "prebreathe"],
  },
  {
    aliases: ["isle", "in suit light exercise", "ejercicio ligero dentro del traje"],
    terms: ["isle", "eva", "prebreathe"],
  },
  {
    aliases: ["shuttle staged protocol", "protocolo escalonado del transbordador"],
    terms: ["shuttle", "staged", "protocol", "prebreathe"],
  },
  {
    aliases: ["hypoxia treatment", "tratamiento de la hipoxia", "tratamiento de hipoxia"],
    terms: ["hypoxia", "treatment", "capability"],
  },
  {
    aliases: ["dcs treatment", "decompression sickness treatment", "tratamiento de la enfermedad por descompresión"],
    terms: ["dcs", "treatment", "capability"],
  },
  {
    aliases: ["eclss", "pulse oximetry", "pulsioximetría", "oximetría de pulso"],
    terms: ["eclss", "pulse", "oximetry", "hypoxia"],
  },
  {
    aliases: ["fluid loading", "carga de líquidos", "carga de fluidos", "fluid load"],
    terms: ["fluid", "loading", "orthostatic", "reentry"],
  },
  {
    aliases: ["compression garment", "compression garments", "prendas de compresión", "traje de compresión"],
    terms: ["compression", "garments", "orthostatic"],
  },
  {
    aliases: ["lbnp", "lower body negative pressure", "presión negativa en la parte inferior del cuerpo"],
    terms: ["lbnp", "lower", "body", "negative", "pressure"],
  },
  {
    aliases: ["orthostatic cooling", "cooling countermeasure", "enfriamiento para la intolerancia ortostática"],
    terms: ["orthostatic", "cooling", "countermeasures"],
  },
  {
    aliases: ["thigh cuffs", "bandas de muslo", "torniquetes de muslo"],
    terms: ["thigh", "cuffs", "cardiovascular"],
  },
  {
    aliases: ["targeted ultrasound surveillance", "vigilancia ecográfica dirigida"],
    terms: ["targeted", "ultrasound", "surveillance"],
  },
  {
    aliases: ["orthostatic tolerance test", "prueba de tolerancia ortostática"],
    terms: ["orthostatic", "tolerance", "test"],
  },
  {
    aliases: ["radiation shielding", "radiation countermeasures", "blindaje contra radiación", "blindaje radiológico"],
    terms: ["radiation", "shielding", "countermeasures"],
  },
  {
    aliases: ["bls", "acls", "crew medical officer", "soporte vital básico", "soporte vital cardiovascular avanzado"],
    terms: ["bls", "acls", "crew", "medical", "officer"],
  },
  {
    aliases: ["renal stones screening", "renal stone screening", "cribado de cálculos renales", "detección de cálculos renales"],
    terms: ["renal", "stones", "ultrasound", "screening"],
  },
  {
    aliases: ["renal stones clinical practice guideline", "guideline for the monitoring and management of renal stones", "guía clínica de cálculos renales"],
    terms: ["renal", "stones", "clinical", "practice", "guideline"],
  },
  {
    aliases: ["sensorimotor guidelines", "guías sensoriomotoras", "acondicionamiento sensoriomotor"],
    terms: ["sensorimotor", "guidelines", "conditioning"],
  },
  {
    aliases: ["balance rehabilitation", "rehabilitación del equilibrio", "rehabilitación vestibular"],
    terms: ["balance", "rehabilitation", "readaptation"],
  },
  {
    aliases: ["dynamic posturography", "posturografía dinámica"],
    terms: ["dynamic", "posturography", "balance"],
  },
  {
    aliases: ["functional mobility test", "prueba de movilidad funcional"],
    terms: ["functional", "mobility", "test", "landing"],
  },
  {
    aliases: ["light exposure", "circadian phase shifting", "exposición a la luz", "ajuste de fase circadiana", "solid state light assemblies", "ssla"],
    terms: ["light", "exposure", "circadian", "phase", "shifting"],
  },
  {
    aliases: ["work hour guidelines", "work hours", "límites de jornada", "horas de trabajo", "duración del turno"],
    terms: ["work", "hour", "guidelines", "fatigue"],
  },
  {
    aliases: ["actigraphy", "actigrafía"],
    terms: ["actigraphy", "sleep", "monitoring"],
  },
  {
    aliases: ["dxa", "qct", "bone densitometry", "densitometría ósea", "absorciometría de rayos x"],
    terms: ["dxa", "qct", "bone", "densitometry"],
  },
  {
    aliases: ["ared", "advanced resistive exercise device", "resistive exercise", "ejercicio resistivo", "ejercicio de resistencia para huesos"],
    terms: ["ared", "resistive", "exercise", "bone"],
  },
  {
    aliases: ["bisphosphonate flight investigation", "bisphosphonate bone flight study", "estudio de bisfosfonatos"],
    terms: ["bisphosphonate", "bone", "flight", "study"],
  },
  {
    aliases: ["cycle ergometer", "cicloergómetro", "aerobic capacity test", "prueba de capacidad aeróbica"],
    terms: ["cycle", "ergometer", "aerobic", "capacity", "test"],
  },
  {
    aliases: ["treadmill", "cinta de correr", "exercise prescription", "prescripción de ejercicio"],
    terms: ["treadmill", "aerobic", "exercise", "prescription"],
  },
  {
    aliases: ["cone agility test", "prueba de agilidad con conos"],
    terms: ["cone", "agility", "test", "performance"],
  },
  {
    aliases: ["ventilatory threshold", "umbral ventilatorio"],
    terms: ["ventilatory", "threshold", "aerobic", "capacity"],
  },
  {
    aliases: ["optical coherence tomography", "oct", "tomografía de coherencia óptica"],
    terms: ["oct", "optical", "coherence", "tomography", "sans"],
  },
  {
    aliases: ["fundoscopy", "fundus exam", "fondo de ojo", "fundoscopía", "oftalmoscopía"],
    terms: ["fundoscopy", "retina", "sans"],
  },
  {
    aliases: ["sans countermeasures", "mechanical sans countermeasures", "contramedidas para sans", "contramedidas neurooculares"],
    terms: ["mechanical", "sans", "countermeasures"],
  },
  {
    aliases: ["fluid intake", "hydration monitoring", "ingesta de líquidos", "monitoreo de hidratación"],
    terms: ["fluid", "intake", "hydration", "homeostasis"],
  },
  {
    aliases: ["urinary calcium", "calcio urinario", "calcio en la orina"],
    terms: ["urinary", "calcium", "bone", "nutrition"],
  },
  {
    aliases: ["nutritional countermeasures", "contramedidas nutricionales"],
    terms: ["nutritional", "countermeasures", "bone", "loss"],
  },
  {
    aliases: ["dust control", "control del polvo lunar", "control del regolito", "lunar dust mitigation"],
    terms: ["lunar", "dust", "control", "apollo"],
  },
  {
    aliases: ["respiratory protection", "protección respiratoria contra polvo lunar"],
    terms: ["lunar", "dust", "respiratory", "protection"],
  },
  {
    aliases: ["wake eeg", "eeg de vigilia", "registro eeg de vigilia"],
    terms: ["wake", "eeg", "sleep", "recordings"],
  },
  {
    aliases: ["circadian sleep countermeasures", "contramedidas circadianas", "ajuste del reloj biológico"],
    terms: ["circadian", "sleep", "countermeasures", "treatments"],
  },
  {
    aliases: ["sirius 19", "protocolo de sueño sirius"],
    terms: ["sirius", "sleep", "protocol"],
  },
  {
    aliases: ["cognition battery", "batería cognitiva", "batería de pruebas cognitivas"],
    terms: ["cognition", "battery", "cognitive", "performance"],
  },
  {
    aliases: ["sit to stand", "sit to stand test", "prueba de sentarse y levantarse"],
    terms: ["sit", "to", "stand", "landing"],
  },
  {
    aliases: ["walk and turn", "tandem walk", "caminata en tándem", "prueba de caminar y girar"],
    terms: ["walk", "and", "turn", "tandem", "walk"],
  },
  {
    aliases: ["prisma cardiovascular", "revisión sistemática cardiovascular"],
    terms: ["systematic", "review", "prisma", "cardiovascular"],
  },
  {
    aliases: ["orthostatic intolerance countermeasures", "contramedidas para la intolerancia ortostática"],
    terms: ["orthostatic", "intolerance", "autonomic", "countermeasures"],
  },
  {
    aliases: ["radiation injuries prevention", "prevención de lesiones por radiación"],
    terms: ["radiation", "injuries", "prevention", "space"],
  },
  {
    aliases: ["tilt table", "mesa basculante", "mesa de inclinación"],
    terms: ["tilt", "table", "visual", "microgravity"],
  },
  {
    aliases: ["sans management", "manejo del síndrome neuroocular"],
    terms: ["neuro", "ocular", "syndrome", "management"],
  },
  {
    aliases: ["bone density meta analysis", "metaanálisis de densidad ósea"],
    terms: ["bone", "density", "meta", "analysis", "measurement"],
  },
  {
    aliases: ["hr pqct", "hrpqct", "microarquitectura ósea con tomografía"],
    terms: ["hr", "pqct", "bone", "microarchitecture"],
  },
  {
    aliases: ["bone marrow magnetic resonance imaging", "resonancia magnética de médula ósea"],
    terms: ["bone", "marrow", "magnetic", "resonance", "imaging"],
  },
  {
    aliases: ["inspiration4 serum", "serum metabolic panel", "panel metabólico sérico"],
    terms: ["inspiration4", "serum", "metabolic", "panel"],
  },
  {
    aliases: ["inspiration4 urine", "urine inflammation panel", "panel de inflamación en orina"],
    terms: ["inspiration4", "urine", "inflammation", "panel"],
  },
  {
    aliases: ["bed rest exercise training", "ejercicio durante reposo en cama"],
    terms: ["bed", "rest", "exercise", "mitochondrial"],
  },
];
