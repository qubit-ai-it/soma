import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMockClassifier } from "./classifier.mock.ts";
import type { RiskAssessment, RiskInput } from "./classifier.port.ts";

const nominal: RiskInput = {
  heartRateBpm: 70,
  spo2Pct: 98,
  sleepHours: 7,
  cumulativeDoseMsv: 20,
};
const critical: RiskInput = {
  heartRateBpm: 110,
  spo2Pct: 90,
  sleepHours: 4,
  cumulativeDoseMsv: 150,
};

async function classify(
  input: RiskInput,
  random: () => number,
): Promise<RiskAssessment> {
  const result = await createMockClassifier({ random }).classify(input);
  assert.ok(result.ok);
  return result.value;
}

describe("simulated Jev classifier", () => {
  it("varies its output with the random source", async () => {
    const a = await classify(nominal, () => 0.05);
    const b = await classify(nominal, () => 0.95);
    assert.notDeepEqual(a.probabilities, b.probabilities);
  });

  it("is reproducible for the same random sequence", async () => {
    const sequence = () => {
      let i = 0;
      return () => [0.2, 0.7, 0.4][i++ % 3];
    };
    assert.deepEqual(
      (await classify(nominal, sequence())).probabilities,
      (await classify(nominal, sequence())).probabilities,
    );
  });

  it("keeps the level tied to the signals when noise is neutral", async () => {
    assert.equal((await classify(nominal, () => 0.5)).level, "low");
    assert.equal((await classify(critical, () => 0.5)).level, "high");
  });

  it("always returns a valid distribution and an honest source", async () => {
    for (let i = 0; i < 200; i++) {
      const assessment = await classify(i % 2 ? nominal : critical, Math.random);
      const total = Object.values(assessment.probabilities).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(total - 1) < 1e-9);
      assert.ok(assessment.confidence >= 0 && assessment.confidence <= 1);
      assert.equal(assessment.calibrated, false);
      assert.equal(assessment.source.mode, "mock");
      assert.equal(assessment.source.provider, "simulated-jev");
    }
  });
});
