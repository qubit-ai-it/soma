import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectProtocols } from "./protocols.select.ts";
import type { Protocol, SelectionInput } from "./protocols.types.ts";

const approval = {
  approvedBy: "Demo physician panel",
  version: "demo-1.0.0",
  approvedAt: "2026-10-01T00:00:00Z",
  source: "Demonstration content, not clinical guidance",
  demonstration: true,
} as const;

function protocol(id: string, triggers: Protocol["triggers"]): Protocol {
  return {
    id,
    title: id,
    summary: "s",
    steps: [{ id: `${id}-1`, text: "step" }],
    triggers,
    approval,
  };
}

const library: Protocol[] = [
  protocol("sleep", { ruleIds: ["sleep-low"], signals: [] }),
  protocol("hrv", { ruleIds: [], signals: ["hrv"] }),
  protocol("notify", { ruleIds: [], signals: [], minStatus: "F2" }),
  protocol("recheck", { ruleIds: [], signals: [], anyEvaluable: true }),
];

function input(partial: Partial<SelectionInput>): SelectionInput {
  return { status: "F1", triggeredRules: [], evidence: [], ...partial };
}

describe("selectProtocols", () => {
  it("selects nothing when the status is NOT_EVALUABLE", () => {
    const result = selectProtocols(
      input({ status: "NOT_EVALUABLE", triggeredRules: ["sleep-low"] }),
      library,
    );
    assert.deepEqual(result, []);
  });

  it("selects nothing at F0", () => {
    assert.deepEqual(selectProtocols(input({ status: "F0" }), library), []);
  });

  it("matches by triggered rule id and reports why", () => {
    const result = selectProtocols(input({ triggeredRules: ["sleep-low"] }), library);
    assert.deepEqual(
      result.filter((s) => s.protocol.id === "sleep").map((s) => s.matchedBy),
      [["rule:sleep-low"]],
    );
  });

  it("matches by signal from signal evidence", () => {
    const result = selectProtocols(
      input({ evidence: [{ kind: "signal", signal: "hrv" }] }),
      library,
    );
    assert.deepEqual(
      result.find((s) => s.protocol.id === "hrv")?.matchedBy,
      ["signal:hrv"],
    );
  });

  it("matches by signal from convergence evidence", () => {
    const result = selectProtocols(
      input({ evidence: [{ kind: "convergence", signals: ["hrv", "fatigue"] }] }),
      library,
    );
    assert.equal(result.some((s) => s.protocol.id === "hrv"), true);
  });

  it("does not select a protocol whose triggers do not match", () => {
    const result = selectProtocols(input({ triggeredRules: ["fatigue-high"] }), library);
    assert.equal(result.some((s) => s.protocol.id === "sleep"), false);
    assert.equal(result.some((s) => s.protocol.id === "hrv"), false);
  });

  it("applies the minimum status for the escalation protocol", () => {
    const f1 = selectProtocols(input({ status: "F1" }), library);
    assert.equal(f1.some((s) => s.protocol.id === "notify"), false);
    const f2 = selectProtocols(input({ status: "F2" }), library);
    assert.deepEqual(f2.find((s) => s.protocol.id === "notify")?.matchedBy, ["status:F2"]);
    const f3 = selectProtocols(input({ status: "F3" }), library);
    assert.equal(f3.some((s) => s.protocol.id === "notify"), true);
  });

  it("includes anyEvaluable protocols at F1 and above", () => {
    const result = selectProtocols(input({ status: "F1" }), library);
    assert.deepEqual(result.find((s) => s.protocol.id === "recheck")?.matchedBy, ["status:F1"]);
  });

  it("keeps library order and is deterministic", () => {
    const i = input({
      status: "F2",
      triggeredRules: ["sleep-low"],
      evidence: [{ kind: "signal", signal: "hrv" }],
    });
    const a = selectProtocols(i, library);
    assert.deepEqual(a.map((s) => s.protocol.id), ["sleep", "hrv", "notify", "recheck"]);
    assert.deepEqual(selectProtocols(i, library), a);
  });

  it("does not mutate its input", () => {
    const i = input({ triggeredRules: ["sleep-low"] });
    const copy = structuredClone(i);
    selectProtocols(i, library);
    assert.deepEqual(i, copy);
  });
});
