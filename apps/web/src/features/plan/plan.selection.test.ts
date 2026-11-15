import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectionInputFromFlags } from "./plan.selection.ts";

describe("selectionInputFromFlags", () => {
  it("maps nominal attention without flags to F0", () => {
    const input = selectionInputFromFlags([], "nominal");
    assert.equal(input.status, "F0");
    assert.deepEqual(input.triggeredRules, []);
  });

  it("maps watch to F1 and review to F2", () => {
    assert.equal(selectionInputFromFlags([], "watch").status, "F1");
    assert.equal(selectionInputFromFlags([], "review").status, "F2");
  });

  it("maps flag codes to demo rule ids and signal evidence", () => {
    const input = selectionInputFromFlags(["short-sleep", "high-heart-rate"], "watch");
    assert.deepEqual(input.triggeredRules, ["sleep-low", "heart-rate-high"]);
    assert.deepEqual(input.evidence, [
      { kind: "signal", signal: "sleepHours" },
      { kind: "signal", signal: "heartRate" },
    ]);
  });

  it("ignores flags with no demo rule", () => {
    const input = selectionInputFromFlags(["low-spo2", "high-dose"], "watch");
    assert.deepEqual(input.triggeredRules, []);
    assert.deepEqual(input.evidence, []);
  });
});
