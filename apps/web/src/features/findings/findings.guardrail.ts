export type GuardrailResult = { allowed: true } | { allowed: false; reason: string };

type Rule = { reason: string; pattern: RegExp };

const EN_SUBJECT = "(?:you|the patient|patient|the crew member|crew member|the astronaut)";

const DIAGNOSIS = "Contains a diagnosis: SOMA only issues preliminary findings.";
const PRESCRIPTION = "Contains a prescription: SOMA does not prescribe treatments.";

const RULES: Rule[] = [
  {
    reason: DIAGNOSIS,
    pattern: new RegExp(`\\b${EN_SUBJECT}\\s+(?:has|have|suffers? from|is suffering from)\\b`),
  },
  { reason: DIAGNOSIS, pattern: /\bdiagnos(?:is|es)\s+(?:is|of)\b/ },
  { reason: DIAGNOSIS, pattern: /\b(?:is|was|been)\s+diagnosed\b/ },
  { reason: DIAGNOSIS, pattern: /\bconfirms?\s+(?:a|the)\s+diagnosis\b/ },

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
