import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildObservations } from "../scenario/scenario.build.ts";
import { scenarioSchema } from "../scenario/scenario.schema.ts";
import { buildFollowUpContract } from "./followup.contract.ts";
import { evaluateFollowUp } from "./followup.logic.ts";
import type { FollowUpContract, FollowUpResult } from "./followup.types.ts";

export type FollowUpScenarioId = "followup-recovery" | "followup-worsening";

export const FOLLOWUP_SCENARIOS: { id: FollowUpScenarioId; label: string }[] = [
  { id: "followup-recovery", label: "Recovery" },
  { id: "followup-worsening", label: "Worsening" },
];

export type FollowUpView = {
  scenarioId: FollowUpScenarioId;
  title: string;
  contract: FollowUpContract;
  result: FollowUpResult;
};

export async function getFollowUp(
  subjectId: string,
  scenarioId: FollowUpScenarioId,
): Promise<FollowUpView | null> {
  const file = path.join(process.cwd(), "data", "seed", "scenarios", `${scenarioId}.json`);
  const scenario = scenarioSchema.parse(JSON.parse(await readFile(file, "utf-8")));
  if (scenario.subjectId !== subjectId) return null;

  const contract = buildFollowUpContract({
    subjectId,
    planStartedAt: "2026-11-18T00:00:00Z",
    baselineFrozenAt: scenario.baselineUntil,
    targets: [
      { signal: "sleepHours", expectedDirection: "increase" },
      { signal: "hrv", expectedDirection: "increase" },
      { signal: "fatigue", expectedDirection: "decrease" },
    ],
  });
  const evaluatedAt = contract.windows[contract.windows.length - 1].end;
  return {
    scenarioId,
    title: scenario.title,
    contract,
    result: evaluateFollowUp({
      contract,
      observations: buildObservations(scenario),
      evaluatedAt,
    }),
  };
}
