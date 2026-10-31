import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { err, ok } from "../../shared/result.ts";
import { createFallbackClassifier } from "./classifier.chain.ts";
import type { RiskAssessment, RiskClassifier, RiskInput } from "./classifier.port.ts";

const input: RiskInput = {
  heartRateBpm: 70,
  spo2Pct: 98,
  sleepHours: 7,
  cumulativeDoseMsv: 20,
};

function assessment(provider: string): RiskAssessment {
  return {
    level: "low",
    probabilities: { low: 1, moderate: 0, high: 0 },
    confidence: 1,
    lowConfidence: false,
    rationale: "",
    calibrated: false,
    source: { provider, mode: "live", fetchedAt: "2026-10-31T00:00:00.000Z" },
  };
}

function stub(result: "fail" | string, calls: string[], name: string): RiskClassifier {
  return {
    async classify() {
      calls.push(name);
      return result === "fail" ? err(`${name} down`) : ok(assessment(result));
    },
  };
}

describe("fallback classifier", () => {
  it("returns the first success and stops", async () => {
    const calls: string[] = [];
    const chain = createFallbackClassifier([
      stub("jev", calls, "jev"),
      stub("laya", calls, "laya"),
    ]);
    const result = await chain.classify(input);
    assert.ok(result.ok);
    assert.equal(result.value.source.provider, "jev");
    assert.deepEqual(calls, ["jev"]);
  });

  it("falls through Jev -> Laya -> mock in order", async () => {
    const calls: string[] = [];
    const chain = createFallbackClassifier([
      stub("fail", calls, "jev"),
      stub("fail", calls, "laya"),
      stub("simulated-jev", calls, "mock"),
    ]);
    const result = await chain.classify(input);
    assert.ok(result.ok);
    assert.equal(result.value.source.provider, "simulated-jev");
    assert.deepEqual(calls, ["jev", "laya", "mock"]);
  });

  it("returns an error naming every failure when all fail", async () => {
    const calls: string[] = [];
    const chain = createFallbackClassifier([
      stub("fail", calls, "jev"),
      stub("fail", calls, "laya"),
    ]);
    const result = await chain.classify(input);
    assert.ok(!result.ok);
    assert.match(result.error, /jev down/);
    assert.match(result.error, /laya down/);
  });
});
