import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeBaseline } from "../baseline/baseline.logic.ts";
import { observationSchema } from "../observation/observation.schema.ts";
import type { Observation } from "../observation/observation.types.ts";
import { ENGINE_VERSION, evaluate } from "./rules.engine.ts";
import { ruleSetSchema } from "./rules.schema.ts";

const BASELINE_UNTIL = "2026-11-08T00:00:00Z";
const EVALUATED_AT = "2026-11-20T00:00:00Z";

const ruleSet = ruleSetSchema.parse({
  version: "demo-0.1.0",
  rules: [
    { id: "sleep-low", signal: "sleepHours", direction: "decrease", minNormalizedDelta: 2, minConsecutive: 1, level: "F1" },
    { id: "hrv-low", signal: "hrv", direction: "decrease", minNormalizedDelta: 2, minConsecutive: 1, level: "F1" },
    { id: "hrv-low-persistent", signal: "hrv", direction: "decrease", minNormalizedDelta: 2, minConsecutive: 3, level: "F2" },
    { id: "fatigue-high", signal: "fatigue", direction: "increase", minNormalizedDelta: 2, minConsecutive: 1, level: "F1" },
    { id: "hr-critical", signal: "heartRate", direction: "increase", minNormalizedDelta: 8, minConsecutive: 1, level: "F3" },
  ],
  convergence: [{ id: "conv-3", minSignals: 3, level: "F2" }],
});

const UNITS: Record<string, string> = {
  hrv: "ms",
  sleepHours: "h",
  fatigue: "score",
  heartRate: "bpm",
};

const BASELINES: Record<string, number[]> = {
  hrv: [50, 52, 51, 53, 49, 52, 50],
  sleepHours: [7.0, 7.5, 7.2, 7.4, 6.9, 7.3, 7.1],
  fatigue: [2, 3, 4, 3, 2, 3, 4],
  heartRate: [60, 62, 61, 63, 59, 62, 60],
};

const NORMAL: Record<string, number[]> = {
  hrv: [51],
  sleepHours: [7.2],
  fatigue: [3],
  heartRate: [61],
};

function make(
  signal: string,
  day: number,
  index: number,
  value: number,
  quality: unknown = { state: "valid" },
): Observation {
  return observationSchema.parse({
    id: `${signal}-${day}-${index}`,
    subjectId: "a1",
    signal,
    value,
    unit: UNITS[signal],
    observedAt: `2026-11-${String(day).padStart(2, "0")}T08:00:00Z`,
    provenance: { type: "synthetic", source: "test" },
    quality,
  });
}

function scenario(
  recent: Partial<Record<string, number[]>> = {},
  baselines: Partial<Record<string, number[]>> = {},
): Observation[] {
  const out: Observation[] = [];
  for (const signal of Object.keys(UNITS)) {
    (baselines[signal] ?? BASELINES[signal]).forEach((v, i) => out.push(make(signal, i + 1, 0, v)));
    (recent[signal] ?? NORMAL[signal]).forEach((v, i) => out.push(make(signal, 10 + i, i, v)));
  }
  return out;
}

function run(observations: Observation[]) {
  return evaluate({
    subjectId: "a1",
    observations,
    ruleSet,
    minBaselineObservations: 5,
    baselineUntil: BASELINE_UNTIL,
    evaluatedAt: EVALUATED_AT,
  });
}

describe("evaluate status", () => {
  it("returns F0 with no triggered rules when every signal is within baseline", () => {
    const result = run(scenario());
    assert.equal(result.status, "F0");
    assert.deepEqual(result.triggeredRules, []);
    assert.deepEqual(result.limitations, []);
  });

  it("returns F1 with linked evidence for a single deviating signal", () => {
    const result = run(scenario({ sleepHours: [6.0] }));
    assert.equal(result.status, "F1");
    assert.deepEqual(result.triggeredRules, ["sleep-low"]);
    const [evidence] = result.evidence;
    assert.equal(evidence.kind, "signal");
    if (evidence.kind !== "signal") return;
    assert.deepEqual(evidence.observationIds, ["sleepHours-10-0"]);
    assert.equal(evidence.baseline.center, 7.2);
    assert.equal(evidence.baseline.frozenAt, BASELINE_UNTIL);
    assert.ok(evidence.normalizedDeltas[0] < -2);
  });

  it("stamps the result with the rule set, engine version and evaluation time", () => {
    const result = run(scenario());
    assert.equal(result.ruleSetVersion, "demo-0.1.0");
    assert.equal(result.engineVersion, ENGINE_VERSION);
    assert.equal(result.evaluatedAt, EVALUATED_AT);
    assert.equal(result.subjectId, "a1");
  });
});

describe("evaluate persistence", () => {
  it("does not fire a persistent rule before enough consecutive deviations", () => {
    const result = run(scenario({ hrv: [45, 44] }));
    assert.equal(result.status, "F1");
    assert.deepEqual(result.triggeredRules, ["hrv-low"]);
  });

  it("fires the persistent rule once the deviation lasts long enough", () => {
    const result = run(scenario({ hrv: [45, 44, 43] }));
    assert.equal(result.status, "F2");
    assert.deepEqual(result.triggeredRules, ["hrv-low", "hrv-low-persistent"]);
  });

  it("breaks persistence when a recent observation returns to baseline", () => {
    const result = run(scenario({ hrv: [45, 51, 43] }));
    assert.deepEqual(result.triggeredRules, ["hrv-low"]);
  });
});

describe("evaluate threshold boundary", () => {
  const baseline = computeBaseline(scenario(), {
    subjectId: "a1",
    signal: "sleepHours",
    minObservations: 5,
    frozenAt: BASELINE_UNTIL,
  });
  assert.equal(baseline.status, "ready");
  const center = baseline.status === "ready" ? baseline.center : 0;
  const variability = baseline.status === "ready" ? baseline.variability : 0;

  it("does not fire just below the threshold", () => {
    const result = run(scenario({ sleepHours: [center - 1.99 * variability] }));
    assert.deepEqual(result.triggeredRules, []);
  });

  it("fires exactly at the threshold", () => {
    const result = run(scenario({ sleepHours: [center - 2 * variability] }));
    assert.deepEqual(result.triggeredRules, ["sleep-low"]);
  });

  it("fires just above the threshold", () => {
    const result = run(scenario({ sleepHours: [center - 2.01 * variability] }));
    assert.deepEqual(result.triggeredRules, ["sleep-low"]);
  });

  it("ignores a deviation in the opposite direction", () => {
    const result = run(scenario({ sleepHours: [center + 5 * variability] }));
    assert.deepEqual(result.triggeredRules, []);
  });
});

describe("evaluate convergence and critical rules", () => {
  it("escalates to F2 when enough distinct signals deviate together", () => {
    const result = run(scenario({ sleepHours: [6.0], hrv: [45], fatigue: [7] }));
    assert.equal(result.status, "F2");
    assert.deepEqual(result.triggeredRules, ["sleep-low", "hrv-low", "fatigue-high", "conv-3"]);
    const convergence = result.evidence.find((e) => e.kind === "convergence");
    assert.deepEqual(convergence?.kind === "convergence" && convergence.signals, [
      "fatigue",
      "hrv",
      "sleepHours",
    ]);
  });

  it("does not converge with fewer signals than required", () => {
    const result = run(scenario({ sleepHours: [6.0], hrv: [45] }));
    assert.equal(result.status, "F1");
    assert.equal(result.triggeredRules.includes("conv-3"), false);
  });

  it("lets an explicit critical rule reach F3 from one signal", () => {
    const result = run(scenario({ heartRate: [80] }));
    assert.equal(result.status, "F3");
    assert.deepEqual(result.triggeredRules, ["hr-critical"]);
  });
});

describe("evaluate insufficient information", () => {
  it("returns NOT_EVALUABLE, not F0, when a signal has no recent data", () => {
    const result = run(scenario({ hrv: [] }));
    assert.equal(result.status, "NOT_EVALUABLE");
    assert.deepEqual(result.limitations, ["no-recent-observations:hrv"]);
  });

  it("returns NOT_EVALUABLE when a baseline is too short", () => {
    const result = run(scenario({}, { hrv: [50, 52, 51] }));
    assert.equal(result.status, "NOT_EVALUABLE");
    assert.deepEqual(result.limitations, ["insufficient-baseline:hrv:too-few-observations"]);
  });

  it("returns NOT_EVALUABLE when the baseline has no variability", () => {
    const result = run(scenario({ fatigue: [9] }, { fatigue: [3, 3, 3, 3, 3, 3, 3] }));
    assert.equal(result.status, "NOT_EVALUABLE");
    assert.deepEqual(result.limitations, ["zero-variability:fatigue"]);
    assert.deepEqual(result.triggeredRules, []);
  });

  it("keeps a detected deviation visible even when another signal is missing", () => {
    const result = run(scenario({ sleepHours: [6.0], hrv: [] }));
    assert.equal(result.status, "F1");
    assert.deepEqual(result.triggeredRules, ["sleep-low"]);
    assert.deepEqual(result.limitations, ["no-recent-observations:hrv"]);
  });
});

describe("evaluate input handling", () => {
  it("ignores observations after the evaluation time", () => {
    const late = make("hrv", 25, 0, 30);
    assert.equal(run([...scenario(), late]).status, "F0");
  });

  it("ignores suspect observations in the recent window", () => {
    const suspect = make("hrv", 12, 0, 30, { state: "suspect", reason: "noisy" });
    assert.equal(run([...scenario(), suspect]).status, "F0");
  });

  it("is deterministic, order independent and does not mutate its input", () => {
    const observations = scenario({ hrv: [45, 44, 43], sleepHours: [6.0] });
    const snapshot = JSON.stringify(observations);
    const first = run(observations);
    const second = run([...observations].reverse());
    assert.deepEqual(second, first);
    assert.equal(JSON.stringify(observations), snapshot);
  });
});
