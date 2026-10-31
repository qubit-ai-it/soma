import { err, ok, type Result } from "../../shared/result.ts";
import type { RiskInput, RiskLevel } from "./classifier.port.ts";
import type { SystemOneRequest } from "./system-one.client.ts";
import type { ChoiceAnswer } from "./system-one.schema.ts";

export const RISK_LEVELS: readonly RiskLevel[] = ["low", "moderate", "high"];

export const RISK_QUESTION_KEY = "risk";

export type RiskThresholds = { lowConfidenceBelow: number };

export type RiskReading = {
  level: RiskLevel;
  probabilities: Record<RiskLevel, number>;
  confidence: number;
  lowConfidence: boolean;
};

const SUM_TOLERANCE = 0.05;

export function buildRiskRequest(input: RiskInput, model: string): SystemOneRequest {
  return {
    model,
    state: {
      heartRateBpm: input.heartRateBpm,
      spo2Pct: input.spo2Pct,
      sleepHours: input.sleepHours,
      cumulativeDoseMsv: input.cumulativeDoseMsv,
    },
    questions: {
      [RISK_QUESTION_KEY]: {
        type: "choice",
        instructions:
          "Classify the health-risk level of this crew member from the vitals in the state: heart rate (bpm), blood oxygen saturation (%), hours slept and cumulative radiation dose (mSv). Illustrative screening only, not a diagnosis.",
        criteria: {
          low: "Vitals are within typical ranges; no sign that needs attention.",
          moderate: "One or two vitals drift from typical ranges; worth monitoring.",
          high: "Several vitals are clearly out of range; a clinician should review soon.",
        },
      },
    },
  };
}

export function toRiskAnswer(
  answer: ChoiceAnswer,
  thresholds: RiskThresholds,
): Result<RiskReading> {
  const raw = RISK_LEVELS.map((level) => answer.probabilities[level]);
  if (raw.some((value) => value === undefined)) {
    return err("Answer is missing a probability for a risk level");
  }
  if (!RISK_LEVELS.includes(answer.choice as RiskLevel)) {
    return err(`Answer names an unknown risk level: ${answer.choice}`);
  }
  const total = raw.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > SUM_TOLERANCE) {
    return err("Answer probabilities do not sum to 1");
  }
  const probabilities = Object.fromEntries(
    RISK_LEVELS.map((level, i) => [level, raw[i] / total]),
  ) as Record<RiskLevel, number>;

  return ok({
    level: answer.choice as RiskLevel,
    probabilities,
    confidence: answer.confidence,
    lowConfidence: answer.confidence < thresholds.lowConfidenceBelow,
  });
}
