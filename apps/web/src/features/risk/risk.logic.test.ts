import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { RiskInput } from "./classifier.port.ts";
import { buildRiskRequest, toRiskAnswer } from "./risk.logic.ts";

const input: RiskInput = {
  heartRateBpm: 72,
  spo2Pct: 97,
  sleepHours: 6.5,
  cumulativeDoseMsv: 42,
};

const thresholds = { lowConfidenceBelow: 0.5 };

function answer(overrides: Record<string, unknown> = {}) {
  return {
    type: "choice" as const,
    choice: "moderate",
    confidence: 0.7,
    probabilities: { low: 0.2, moderate: 0.6, high: 0.2 },
    ...overrides,
  };
}

describe("buildRiskRequest", () => {
  it("sends the vitals as state and one choice question with a description per level", () => {
    const request = buildRiskRequest(input, "some-model");
    assert.equal(request.model, "some-model");
    assert.deepEqual(request.state, {
      heartRateBpm: 72,
      spo2Pct: 97,
      sleepHours: 6.5,
      cumulativeDoseMsv: 42,
    });
    const question = request.questions.risk;
    assert.equal(question.type, "choice");
    assert.deepEqual(Object.keys(question.criteria), ["low", "moderate", "high"]);
    for (const description of Object.values(question.criteria)) {
      assert.ok(description.length > 0);
    }
  });
});

describe("toRiskAnswer", () => {
  it("maps level, probabilities and confidence", () => {
    const result = toRiskAnswer(answer(), thresholds);
    assert.ok(result.ok);
    assert.equal(result.value.level, "moderate");
    assert.deepEqual(result.value.probabilities, { low: 0.2, moderate: 0.6, high: 0.2 });
    assert.equal(result.value.confidence, 0.7);
    assert.equal(result.value.lowConfidence, false);
  });

  it("flags low confidence using the provider threshold", () => {
    const result = toRiskAnswer(answer({ confidence: 0.4 }), thresholds);
    assert.ok(result.ok);
    assert.equal(result.value.lowConfidence, true);
    const strict = toRiskAnswer(answer({ confidence: 0.7 }), { lowConfidenceBelow: 0.8 });
    assert.ok(strict.ok);
    assert.equal(strict.value.lowConfidence, true);
  });

  it("renormalizes probabilities that sum to roughly 1", () => {
    const result = toRiskAnswer(
      answer({ probabilities: { low: 0.21, moderate: 0.6, high: 0.2 } }),
      thresholds,
    );
    assert.ok(result.ok);
    const total = Object.values(result.value.probabilities).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1) < 1e-9);
  });

  it("rejects a missing level, an unknown choice and a bad distribution", () => {
    assert.equal(
      toRiskAnswer(answer({ probabilities: { low: 0.5, moderate: 0.5 } }), thresholds).ok,
      false,
    );
    assert.equal(toRiskAnswer(answer({ choice: "critical" }), thresholds).ok, false);
    assert.equal(
      toRiskAnswer(
        answer({ probabilities: { low: 0.1, moderate: 0.1, high: 0.1 } }),
        thresholds,
      ).ok,
      false,
    );
  });
});
