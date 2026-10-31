import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import type { RiskInput } from "./classifier.port.ts";
import {
  choiceReply,
  startFakeSystemOne,
  type FakeSystemOne,
} from "./fake-system-one.testing.ts";
import { createSystemOneClassifier } from "./system-one.classifier.ts";

const input: RiskInput = {
  heartRateBpm: 110,
  spo2Pct: 90,
  sleepHours: 4,
  cumulativeDoseMsv: 150,
};

let fake: FakeSystemOne | undefined;
afterEach(async () => {
  await fake?.close();
  fake = undefined;
});

function profile(provider: "jev" | "laya", url: string) {
  return {
    provider,
    baseUrl: url,
    apiKey: provider === "jev" ? "k" : undefined,
    models: { risk: provider === "jev" ? "jev-latest" : "typed-decisions" },
    thresholds: { lowConfidenceBelow: provider === "jev" ? 0.6 : 0.3 },
    calibrated: provider === "jev",
    maxChoices: provider === "jev" ? 255 : 100,
    retry: { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 1 },
    sleep: async () => {},
  };
}

describe("System One classifier", () => {
  it("serves Jev as live, with the Jev model from the model map", async () => {
    fake = await startFakeSystemOne([choiceReply({ low: 0.05, moderate: 0.15, high: 0.8 }, 0.9)]);
    const result = await createSystemOneClassifier(profile("jev", fake.url)).classify(input);
    assert.ok(result.ok);
    assert.equal(result.value.level, "high");
    assert.equal(result.value.confidence, 0.9);
    assert.equal(result.value.lowConfidence, false);
    assert.equal(result.value.calibrated, true);
    assert.equal(result.value.source.provider, "jev");
    assert.equal(result.value.source.mode, "live");
    assert.equal((fake.requests[0].body as { model: string }).model, "jev-latest");
  });

  it("serves Laya through the same client, uncalibrated and with its own model and threshold", async () => {
    fake = await startFakeSystemOne([choiceReply({ low: 0.3, moderate: 0.4, high: 0.3 }, 0.2)]);
    const result = await createSystemOneClassifier(profile("laya", fake.url)).classify(input);
    assert.ok(result.ok);
    assert.equal(result.value.calibrated, false);
    assert.equal(result.value.source.provider, "laya");
    assert.equal(result.value.source.mode, "live");
    assert.equal(result.value.lowConfidence, true);
    assert.equal((fake.requests[0].body as { model: string }).model, "typed-decisions");
    assert.equal(fake.requests[0].headers.authorization, undefined);
  });

  it("returns an error Result instead of throwing on 401, 429 and 529", async () => {
    for (const status of [401, 429, 529]) {
      fake = await startFakeSystemOne([{ status }]);
      const result = await createSystemOneClassifier(profile("jev", fake.url)).classify(input);
      assert.ok(!result.ok, `status ${status}`);
      assert.equal(typeof result.error, "string");
      await fake.close();
      fake = undefined;
    }
  });

  it("returns an error Result for an answer that names an unknown level", async () => {
    fake = await startFakeSystemOne([choiceReply({ low: 0.2, critical: 0.8 }, 0.9)]);
    const result = await createSystemOneClassifier(profile("jev", fake.url)).classify(input);
    assert.ok(!result.ok);
  });
});
