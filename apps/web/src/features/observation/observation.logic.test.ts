import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isEvaluable } from "./observation.logic.ts";
import { observationSchema } from "./observation.schema.ts";

const make = (quality: unknown, value: unknown = 60) =>
  observationSchema.parse({
    id: "obs-1",
    subjectId: "subj-a1",
    signal: "heartRate",
    value,
    unit: "bpm",
    observedAt: "2026-11-15T08:00:00Z",
    provenance: { type: "synthetic", source: "demo-scenario" },
    quality,
  });

describe("isEvaluable", () => {
  it("accepts only valid observations", () => {
    assert.equal(isEvaluable(make({ state: "valid" })), true);
    assert.equal(isEvaluable(make({ state: "suspect", reason: "noisy" })), false);
    assert.equal(isEvaluable(make({ state: "invalid", reason: "out-of-range" })), false);
    assert.equal(
      isEvaluable(make({ state: "missing", reason: "sensor-unavailable" }, null)),
      false,
    );
  });
});
