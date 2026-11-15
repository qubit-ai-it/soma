import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ruleSetSchema } from "./rules.schema.ts";

const signalRule = {
  id: "hrv-low",
  signal: "hrv",
  direction: "decrease",
  minNormalizedDelta: 2,
  minConsecutive: 1,
  level: "F1",
};

const ruleSet = {
  version: "demo-0.1.0",
  rules: [signalRule],
  convergence: [{ id: "conv-3", minSignals: 3, level: "F2" }],
};

describe("rule set schema", () => {
  it("accepts a valid rule set", () => {
    assert.ok(ruleSetSchema.safeParse(ruleSet).success);
  });

  it("defaults convergence to an empty list", () => {
    const parsed = ruleSetSchema.parse({ version: "v", rules: [signalRule] });
    assert.deepEqual(parsed.convergence, []);
  });

  it("rejects an empty rule list and a missing version", () => {
    assert.equal(ruleSetSchema.safeParse({ ...ruleSet, rules: [] }).success, false);
    assert.equal(ruleSetSchema.safeParse({ ...ruleSet, version: "" }).success, false);
  });

  it("rejects non-positive thresholds and invalid persistence", () => {
    for (const patch of [
      { minNormalizedDelta: 0 },
      { minNormalizedDelta: -1 },
      { minConsecutive: 0 },
      { minConsecutive: 1.5 },
    ]) {
      assert.equal(
        ruleSetSchema.safeParse({ ...ruleSet, rules: [{ ...signalRule, ...patch }] }).success,
        false,
      );
    }
  });

  it("rejects an unknown level, direction or F0 as a rule level", () => {
    for (const patch of [{ level: "F4" }, { level: "F0" }, { direction: "sideways" }]) {
      assert.equal(
        ruleSetSchema.safeParse({ ...ruleSet, rules: [{ ...signalRule, ...patch }] }).success,
        false,
      );
    }
  });

  it("rejects a convergence rule that needs fewer than two signals or targets F1", () => {
    for (const patch of [{ minSignals: 1 }, { level: "F1" }]) {
      assert.equal(
        ruleSetSchema.safeParse({
          ...ruleSet,
          convergence: [{ id: "c", minSignals: 3, level: "F2", ...patch }],
        }).success,
        false,
      );
    }
  });

  it("rejects duplicate rule ids across signal and convergence rules", () => {
    const dup = { ...ruleSet, convergence: [{ id: "hrv-low", minSignals: 2, level: "F2" }] };
    assert.equal(ruleSetSchema.safeParse(dup).success, false);
    const dupRules = { ...ruleSet, rules: [signalRule, signalRule] };
    assert.equal(ruleSetSchema.safeParse(dupRules).success, false);
  });
});
