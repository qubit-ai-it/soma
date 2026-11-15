import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { observationSchema } from "./observation.schema.ts";

const base = {
  id: "obs-1",
  subjectId: "subj-a1",
  signal: "heartRate",
  value: 62,
  unit: "bpm",
  observedAt: "2026-11-15T08:00:00Z",
  provenance: { type: "synthetic", source: "demo-scenario" },
  quality: { state: "valid" },
};

describe("observation schema", () => {
  it("accepts a valid synthetic observation", () => {
    assert.ok(observationSchema.safeParse(base).success);
  });

  it("keeps observedAt and receivedAt as separate timestamps", () => {
    const parsed = observationSchema.parse({
      ...base,
      receivedAt: "2026-11-15T09:10:00Z",
    });
    assert.equal(parsed.observedAt, "2026-11-15T08:00:00Z");
    assert.equal(parsed.receivedAt, "2026-11-15T09:10:00Z");
  });

  it("rejects an unknown provenance type", () => {
    const bad = { ...base, provenance: { type: "guessed", source: "x" } };
    assert.equal(observationSchema.safeParse(bad).success, false);
  });

  it("requires a dataset for historical observations", () => {
    const historical = { ...base, provenance: { type: "historical", source: "osdr" } };
    assert.equal(observationSchema.safeParse(historical).success, false);
    const documented = {
      ...base,
      provenance: { type: "historical", source: "osdr", dataset: "OSD-000" },
    };
    assert.ok(observationSchema.safeParse(documented).success);
  });

  it("rejects an empty unit and a malformed timestamp", () => {
    assert.equal(observationSchema.safeParse({ ...base, unit: "" }).success, false);
    assert.equal(
      observationSchema.safeParse({ ...base, observedAt: "yesterday" }).success,
      false,
    );
  });

  it("rejects a non-finite numeric value", () => {
    assert.equal(observationSchema.safeParse({ ...base, value: Number.NaN }).success, false);
  });
});

describe("observation quality", () => {
  it("requires a reason for suspect and invalid states", () => {
    for (const state of ["suspect", "invalid"]) {
      assert.equal(
        observationSchema.safeParse({ ...base, quality: { state } }).success,
        false,
      );
      assert.ok(
        observationSchema.safeParse({
          ...base,
          quality: { state, reason: "sensor-disconnected" },
        }).success,
      );
    }
  });

  it("represents a missing value without a value, never as zero", () => {
    const missing = {
      ...base,
      value: null,
      quality: { state: "missing", reason: "sensor-unavailable" },
    };
    assert.ok(observationSchema.safeParse(missing).success);
    assert.equal(
      observationSchema.safeParse({ ...missing, value: 0 }).success,
      false,
    );
  });

  it("requires a reason when the value is missing", () => {
    const noReason = { ...base, value: null, quality: { state: "missing" } };
    assert.equal(observationSchema.safeParse(noReason).success, false);
  });

  it("rejects a null value when quality is not missing", () => {
    assert.equal(observationSchema.safeParse({ ...base, value: null }).success, false);
  });

  it("accepts a zero value as a real measurement", () => {
    assert.ok(observationSchema.safeParse({ ...base, value: 0 }).success);
  });
});
