import { err, ok } from "../../shared/result.ts";
import type { RiskClassifier } from "./classifier.port.ts";
import { buildRiskRequest, RISK_QUESTION_KEY, toRiskAnswer, type RiskThresholds } from "./risk.logic.ts";
import { createSystemOneClient, type SystemOneClientOptions } from "./system-one.client.ts";

export type SystemOneProfile = Pick<
  SystemOneClientOptions,
  "baseUrl" | "apiKey" | "maxChoices" | "retry" | "timeoutMs" | "fetch" | "sleep"
> & {
  provider: "jev" | "laya";
  models: { risk: string };
  thresholds: RiskThresholds;
  calibrated: boolean;
};

export function createSystemOneClassifier(profile: SystemOneProfile): RiskClassifier {
  const client = createSystemOneClient(profile);

  return {
    async classify(input) {
      const model = profile.models.risk;
      const response = await client.ask(buildRiskRequest(input, model));
      if (!response.ok) return err(`${profile.provider}: ${response.error.message}`);

      const answer = response.value.answers[RISK_QUESTION_KEY];
      if (!answer) return err(`${profile.provider}: response has no risk answer`);

      const reading = toRiskAnswer(answer, profile.thresholds);
      if (!reading.ok) return err(`${profile.provider}: ${reading.error}`);

      return ok({
        ...reading.value,
        rationale: `${profile.provider} (${response.value.model ?? model}) classified 4 vitals; screening only.`,
        calibrated: profile.calibrated,
        source: {
          provider: profile.provider,
          mode: "live",
          fetchedAt: new Date().toISOString(),
        },
      });
    },
  };
}
