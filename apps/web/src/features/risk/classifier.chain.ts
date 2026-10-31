import { err } from "../../shared/result.ts";
import type { RiskClassifier } from "./classifier.port.ts";

export function createFallbackClassifier(chain: RiskClassifier[]): RiskClassifier {
  return {
    async classify(input) {
      const failures: string[] = [];
      for (const classifier of chain) {
        const result = await classifier.classify(input);
        if (result.ok) return result;
        failures.push(result.error);
      }
      return err(`All classifiers failed: ${failures.join("; ")}`);
    },
  };
}
