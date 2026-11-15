import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { evaluate } from "../rules/rules.engine.ts";
import { ruleSetSchema } from "../rules/rules.schema.ts";
import { buildObservations } from "./scenario.build.ts";
import { scenarioSchema } from "./scenario.schema.ts";

function readSeed(path: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../../data/seed/${path}`, import.meta.url), "utf8"));
}

const scenario = scenarioSchema.parse(readSeed("scenarios/fatigue-sleep-hrv.json"));
const ruleSet = ruleSetSchema.parse(readSeed("demo-ruleset.json"));
const observations = buildObservations(scenario);

const statusAt = (evaluatedAt: string) =>
  evaluate({
    subjectId: scenario.subjectId,
    observations,
    ruleSet,
    minBaselineObservations: 5,
    baselineUntil: scenario.baselineUntil,
    evaluatedAt,
  });

describe("fatigue-sleep-hrv scenario data", () => {
  it("declares every observation as synthetic", () => {
    assert.ok(observations.every((o) => o.provenance.type === "synthetic"));
  });

  it("covers the four signals of the multimodal case over the same days", () => {
    const signals = new Set(observations.map((o) => o.signal));
    assert.deepEqual([...signals].sort(), ["fatigue", "heartRate", "hrv", "sleepHours"]);
    const lengths = new Set(scenario.series.map((s) => s.values.length));
    assert.equal(lengths.size, 1);
  });

  it("includes a sensor gap in the baseline that stays missing", () => {
    const missing = observations.filter((o) => o.quality.state === "missing");
    assert.equal(missing.length, 1);
    assert.equal(missing[0].signal, "hrv");
    assert.ok(Date.parse(missing[0].observedAt) < Date.parse(scenario.baselineUntil));
  });

  it("walks the checkpoints from stable baseline to persistent deviation", () => {
    const statuses = scenario.checkpoints.map((c) => statusAt(c.evaluatedAt).status);
    assert.deepEqual(statuses, ["F0", "F0", "F1", "F1", "F2", "F2"]);
  });

  it("evaluates every checkpoint without data limitations", () => {
    for (const checkpoint of scenario.checkpoints) {
      assert.deepEqual(statusAt(checkpoint.evaluatedAt).limitations, []);
    }
  });

  it("reaches F2 through persistence and multi-signal convergence", () => {
    const last = statusAt("2026-11-15T12:00:00Z");
    assert.ok(last.triggeredRules.includes("hrv-low-persistent"));
    assert.ok(last.triggeredRules.includes("conv-3"));
  });
});
