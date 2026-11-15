import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckpointView, TriggeredRuleView } from "../evaluation/evaluation.types.ts";
import { selectionInputFromCheckpoint } from "./plan.evaluation.ts";

function checkpoint(
  status: CheckpointView["status"],
  rules: Partial<TriggeredRuleView>[] = [],
): CheckpointView {
  return {
    index: 0,
    label: "test",
    evaluatedAt: "2026-11-15T12:00:00Z",
    status,
    rules: rules.map((r, i) => ({
      id: `rule-${i}`,
      level: "F1",
      kind: "signal",
      label: "l",
      description: "d",
      signals: ["hrv"],
      ...r,
    })),
    limitations: [],
    signals: [],
  };
}

describe("selectionInputFromCheckpoint", () => {
  it("carries the status and the triggered rule ids", () => {
    const input = selectionInputFromCheckpoint(
      checkpoint("F1", [{ id: "sleep-low", signals: ["sleepHours"] }]),
    );
    assert.equal(input.status, "F1");
    assert.deepEqual(input.triggeredRules, ["sleep-low"]);
  });

  it("maps signal rules to signal evidence and convergence rules to convergence evidence", () => {
    const input = selectionInputFromCheckpoint(
      checkpoint("F2", [
        { id: "hrv-low", kind: "signal", signals: ["hrv"] },
        { id: "conv-3", kind: "convergence", signals: ["hrv", "sleepHours", "fatigue"] },
      ]),
    );
    assert.deepEqual(input.evidence, [
      { kind: "signal", signal: "hrv" },
      { kind: "convergence", signals: ["hrv", "sleepHours", "fatigue"] },
    ]);
  });

  it("returns no rules or evidence for F0 and NOT_EVALUABLE", () => {
    for (const status of ["F0", "NOT_EVALUABLE"] as const) {
      const input = selectionInputFromCheckpoint(checkpoint(status));
      assert.deepEqual(input, { status, triggeredRules: [], evidence: [] });
    }
  });
});
