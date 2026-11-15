import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { evaluate } from "../rules/rules.engine.ts";
import { ruleSetSchema } from "../rules/rules.schema.ts";
import { buildObservations } from "../scenario/scenario.build.ts";
import { scenarioSchema } from "../scenario/scenario.schema.ts";

function readSeed(path: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../../data/seed/${path}`, import.meta.url), "utf8"));
}

const ruleSet = ruleSetSchema.parse(readSeed("demo-ruleset.json"));

function walk(file: string) {
  const scenario = scenarioSchema.parse(readSeed(`scenarios/${file}`));
  const observations = buildObservations(scenario);
  const evaluations = scenario.checkpoints.map((checkpoint) =>
    evaluate({
      subjectId: scenario.subjectId,
      observations,
      ruleSet,
      minBaselineObservations: 5,
      baselineUntil: scenario.baselineUntil,
      evaluatedAt: checkpoint.evaluatedAt,
    }),
  );
  return { scenario, observations, evaluations };
}

describe("critical-f3 scenario", () => {
  const { scenario, observations, evaluations } = walk("critical-f3.json");

  it("is synthetic and covers the four signals", () => {
    assert.ok(observations.every((o) => o.provenance.type === "synthetic"));
    assert.deepEqual(
      [...new Set(observations.map((o) => o.signal))].sort(),
      ["fatigue", "heartRate", "hrv", "sleepHours"],
    );
  });

  it("walks from stable to F3", () => {
    assert.deepEqual(
      evaluations.map((e) => e.status),
      ["F0", "F0", "F1", "F1", "F3"],
    );
    assert.equal(evaluations.length, scenario.checkpoints.length);
  });

  it("reaches F3 through one explicit critical rule on a single signal", () => {
    const last = evaluations[evaluations.length - 1];
    assert.ok(last.triggeredRules.includes("heart-rate-critical"));
    const critical = last.evidence.filter((e) => e.level === "F3");
    assert.equal(critical.length, 1);
    assert.equal(critical[0].kind, "signal");
    assert.deepEqual(last.limitations, []);
    assert.ok(!last.triggeredRules.includes("conv-3"));
  });

  it("does not trigger the critical rule before the spike", () => {
    for (const evaluation of evaluations.slice(0, -1)) {
      assert.ok(!evaluation.triggeredRules.includes("heart-rate-critical"));
    }
  });
});

describe("insufficient-data scenario", () => {
  const { observations, evaluations } = walk("insufficient-data.json");

  it("is synthetic and keeps missing values as missing, never zero", () => {
    assert.ok(observations.every((o) => o.provenance.type === "synthetic"));
    const missing = observations.filter((o) => o.quality.state === "missing");
    assert.ok(missing.length > 0);
    assert.ok(missing.every((o) => o.value === null));
  });

  it("is NOT_EVALUABLE at every checkpoint, never F0", () => {
    assert.deepEqual(
      evaluations.map((e) => e.status),
      Array(evaluations.length).fill("NOT_EVALUABLE"),
    );
    assert.ok(evaluations.every((e) => e.triggeredRules.length === 0));
  });

  it("reports a short HRV baseline at every checkpoint", () => {
    for (const evaluation of evaluations) {
      assert.ok(
        evaluation.limitations.includes("insufficient-baseline:hrv:too-few-observations"),
      );
    }
  });

  it("reports a recent gap in sleep only at the first checkpoint", () => {
    const gap = "no-recent-observations:sleepHours";
    assert.ok(evaluations[0].limitations.includes(gap));
    for (const evaluation of evaluations.slice(1)) {
      assert.ok(!evaluation.limitations.includes(gap));
    }
  });
});

describe("demo rule set with the critical rule", () => {
  it("has a single F3 rule", () => {
    const f3 = ruleSet.rules.filter((r) => r.level === "F3");
    assert.deepEqual(f3.map((r) => r.id), ["heart-rate-critical"]);
  });
});
