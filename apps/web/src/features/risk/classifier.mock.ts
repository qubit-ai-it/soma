import { ok } from "../../shared/result.ts";
import { mockSource } from "../../shared/source.ts";
import type { RiskClassifier, RiskLevel } from "./classifier.port.ts";

type Random = () => number;

const LEVELS: RiskLevel[] = ["low", "moderate", "high"];

const BASE: Record<0 | 1 | 2, Record<RiskLevel, number>> = {
  0: { low: 0.8, moderate: 0.15, high: 0.05 },
  1: { low: 0.2, moderate: 0.6, high: 0.2 },
  2: { low: 0.05, moderate: 0.25, high: 0.7 },
};

export function createMockClassifier({
  random = Math.random,
}: { random?: Random } = {}): RiskClassifier {
  return {
    async classify(input) {
      const signals = [
        input.spo2Pct < 94,
        input.heartRateBpm > 100,
        input.sleepHours < 6,
        input.cumulativeDoseMsv > 100,
      ].filter(Boolean).length;
      const base = BASE[Math.min(signals, 2) as 0 | 1 | 2];

      const noisy = LEVELS.map((level) => base[level] * (0.6 + 0.8 * random()));
      const total = noisy.reduce((sum, value) => sum + value, 0);
      const probabilities = Object.fromEntries(
        LEVELS.map((level, i) => [level, noisy[i] / total]),
      ) as Record<RiskLevel, number>;

      const level = LEVELS.reduce((best, current) =>
        probabilities[current] > probabilities[best] ? current : best,
      );
      const entropy = -LEVELS.reduce(
        (sum, l) => sum + probabilities[l] * Math.log(probabilities[l]),
        0,
      );

      return ok({
        level,
        probabilities,
        confidence: 1 - entropy / Math.log(LEVELS.length),
        rationale: `Simulated Jev (random data): ${signals} signal(s) out of range.`,
        calibrated: false,
        source: mockSource("simulated-jev"),
      });
    },
  };
}
