export type GuardrailResult = { allowed: true } | { allowed: false; reason: string };

type Rule = { reason: string; pattern: RegExp };

const SUBJECT = "(?:el|la)?\\s*(?:paciente|astronauta|tripulante|tripulacion|usted)";
const EN_SUBJECT = "(?:you|the patient|patient|the crew member|crew member|the astronaut)";

const DIAGNOSIS = "Contiene un diagnóstico: SOMA solo emite hallazgos preliminares.";
const PRESCRIPTION = "Contiene una prescripción: SOMA no prescribe tratamientos.";

const RULES: Rule[] = [
  { reason: DIAGNOSIS, pattern: new RegExp(`\\b${SUBJECT}\\s+(?:tiene|padece|sufre|presenta un cuadro de)\\b`) },
  { reason: DIAGNOSIS, pattern: /\busted\s+sufre\b/ },
  { reason: DIAGNOSIS, pattern: /\bse\s+(?:diagnostica|confirma el diagnostico)\b/ },
  { reason: DIAGNOSIS, pattern: /\bse\s+confirma\s+(?:el|un)\s+diagnostico\b/ },
  { reason: DIAGNOSIS, pattern: /\bdiagnostico\s+(?:es|de|definitivo|confirmado)\b/ },
  { reason: DIAGNOSIS, pattern: /\bdiagnosticad[oa]\b/ },
  {
    reason: DIAGNOSIS,
    pattern: new RegExp(`\\b${EN_SUBJECT}\\s+(?:has|have|suffers? from|is suffering from)\\b`),
  },
  { reason: DIAGNOSIS, pattern: /\bdiagnos(?:is|es)\s+(?:is|of)\b/ },
  { reason: DIAGNOSIS, pattern: /\b(?:is|was|been)\s+diagnosed\b/ },
  { reason: DIAGNOSIS, pattern: /\bconfirms?\s+(?:a|the)\s+diagnosis\b/ },

  { reason: PRESCRIPTION, pattern: /\b(?:receta|recetar|recetado|prescribe|prescribir|prescripcion)\b/ },
  { reason: PRESCRIPTION, pattern: /\b(?:tomar|tome|administre|administrar|inyecte|inyectar|ingiera)\b/ },
  { reason: PRESCRIPTION, pattern: /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|ml|ui)\b/ },
  { reason: PRESCRIPTION, pattern: /\b(?:prescribes?|prescribed|prescription|dosage|administer)\b/ },
  { reason: PRESCRIPTION, pattern: /\b(?:take|should take|must take)\s+(?:\d|the|some|an?\b)/ },
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function checkFindings(text: string): GuardrailResult {
  const normalized = normalize(text);
  const hit = RULES.find((rule) => rule.pattern.test(normalized));
  return hit === undefined ? { allowed: true } : { allowed: false, reason: hit.reason };
}
