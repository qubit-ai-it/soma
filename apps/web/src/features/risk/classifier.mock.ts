import { ok } from "../../shared/result.ts";
import { mockSource } from "../../shared/source.ts";
import type { RiskClassifier, RiskLevel } from "./classifier.port.ts";

/** Deterministic stand-in: counts out-of-range signals. Not a clinical model. */
export function createMockClassifier(): RiskClassifier {
  return {
    async classify(input) {
      const signals = [
        input.spo2Pct < 94,
        input.heartRateBpm > 100,
        input.sleepHours < 6,
        input.cumulativeDoseMsv > 100,
      ].filter(Boolean).length;

      const level: RiskLevel =
        signals === 0 ? "low" : signals === 1 ? "moderate" : "high";
      const probabilities: Record<RiskLevel, number> = {
        low: 0.1,
        moderate: 0.1,
        high: 0.1,
      };
      probabilities[level] = 0.8;

      return ok({
        level,
        probabilities,
        confidence: 0.5,
        rationale: `Mock classifier: ${signals} signal(s) out of range.`,
        calibrated: false,
        source: mockSource("mock-classifier"),
      });
    },
  };
}
