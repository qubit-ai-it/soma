import { readFileSync } from "node:fs";

import type { Observation } from "../observation/observation.types.ts";
import { buildObservations } from "../scenario/scenario.build.ts";
import { scenarioSchema } from "../scenario/scenario.schema.ts";
import { buildFollowUpContract } from "./followup.contract.ts";
import type { FollowUpContract } from "./followup.types.ts";

export function loadFollowUpScenario(name: "followup-recovery" | "followup-worsening"): {
  contract: FollowUpContract;
  observations: Observation[];
} {
  const raw = JSON.parse(
    readFileSync(new URL(`../../../data/seed/scenarios/${name}.json`, import.meta.url), "utf8"),
  );
  const scenario = scenarioSchema.parse(raw);
  return {
    observations: buildObservations(scenario),
    contract: buildFollowUpContract({
      subjectId: scenario.subjectId,
      planStartedAt: "2026-11-18T00:00:00Z",
      baselineFrozenAt: scenario.baselineUntil,
      targets: [
        { signal: "sleepHours", expectedDirection: "increase" },
        { signal: "hrv", expectedDirection: "increase" },
        { signal: "fatigue", expectedDirection: "decrease" },
      ],
    }),
  };
}
