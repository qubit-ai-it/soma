import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { cache } from "react";

import { ruleSetSchema } from "../rules/rules.schema.ts";
import { scenarioSchema } from "../scenario/scenario.schema.ts";
import { buildEvaluationBoard } from "./evaluation.logic.ts";
import type { EvaluationBoard } from "./evaluation.types.ts";

const SCENARIO_NAMES = ["fatigue-sleep-hrv", "critical-f3", "insufficient-data"];
const MIN_BASELINE_OBSERVATIONS = 5;

async function readSeed(...segments: string[]): Promise<unknown> {
  const file = path.join(process.cwd(), "data", "seed", ...segments);
  return JSON.parse(await readFile(file, "utf-8"));
}

// cache(): one read of the seeds per request
export const getEvaluationBoard = cache(async (): Promise<EvaluationBoard> => {
  const ruleSet = ruleSetSchema.parse(await readSeed("demo-ruleset.json"));
  const scenarios = await Promise.all(
    SCENARIO_NAMES.map(async (name) =>
      scenarioSchema.parse(await readSeed("scenarios", `${name}.json`)),
    ),
  );
  return buildEvaluationBoard(scenarios, ruleSet, {
    minBaselineObservations: MIN_BASELINE_OBSERVATIONS,
  });
});
