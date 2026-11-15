import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { observationSchema } from "../observation/observation.schema.ts";
import type { Observation } from "../observation/observation.types.ts";
import { baselineDelta, computeBaseline } from "./baseline.logic.ts";

type Overrides = Partial<Record<string, unknown>>;

function obs(day: number, value: number | null, extra: Overrides = {}): Observation {
  const quality =
    value === null ? { state: "missing", reason: "sensor-unavailable" } : { state: "valid" };
  return observationSchema.parse({
    id: `obs-${day}-${String(extra.signal ?? "heartRate")}-${String(extra.subjectId ?? "a1")}`,
    subjectId: "a1",
    signal: "heartRate",
    value,
    unit: "bpm",
    observedAt: `2026-11-${String(day).padStart(2, "0")}T08:00:00Z`,
    provenance: { type: "synthetic", source: "test" },
    quality,
    ...extra,
  });
}

const history = [60, 62, 61, 63, 59, 62, 60].map((v, i) => obs(i + 1, v));
const options = { subjectId: "a1", signal: "heartRate", minObservations: 5 };

describe("computeBaseline", () => {
  it("uses the median as center and the scaled MAD as variability", () => {
    const baseline = computeBaseline(history, options);
    assert.equal(baseline.status, "ready");
    if (baseline.status !== "ready") return;
    assert.equal(baseline.center, 61);
    assert.ok(Math.abs(baseline.variability - 1.4826) < 1e-9);
    assert.equal(baseline.sampleCount, 7);
    assert.equal(baseline.unit, "bpm");
  });

  it("averages the two middle values for an even sample", () => {
    const even = [60, 62, 64, 66, 68, 70].map((v, i) => obs(i + 1, v));
    const baseline = computeBaseline(even, options);
    assert.equal(baseline.status === "ready" && baseline.center, 65);
  });

  it("is insensitive to input order", () => {
    const shuffled = [...history].reverse();
    assert.deepEqual(computeBaseline(shuffled, options), computeBaseline(history, options));
  });

  it("is insufficient below the minimum number of observations", () => {
    const baseline = computeBaseline(history.slice(0, 4), options);
    assert.deepEqual(
      { status: baseline.status, reason: baseline.status === "insufficient" && baseline.reason },
      { status: "insufficient", reason: "too-few-observations" },
    );
  });

  it("ignores other subjects, other signals and non-evaluable observations", () => {
    const noise = [
      obs(8, 200, { subjectId: "b2" }),
      obs(9, 200, { signal: "hrv", unit: "ms" }),
      obs(10, null),
      obs(11, 200, { quality: { state: "suspect", reason: "noisy" } }),
    ];
    const baseline = computeBaseline([...history, ...noise], options);
    assert.equal(baseline.status === "ready" && baseline.center, 61);
    assert.equal(baseline.sampleCount, 7);
  });

  it("is insufficient when the same signal mixes units", () => {
    const mixed = [...history, obs(8, 1.0, { unit: "bps" })];
    const baseline = computeBaseline(mixed, options);
    assert.equal(baseline.status === "insufficient" && baseline.reason, "mixed-units");
  });

  it("freezes at a cutoff so a later deviation is not absorbed", () => {
    const deviation = [90, 95, 100, 105, 110, 115, 120].map((v, i) => obs(i + 8, v));
    const frozenAt = "2026-11-08T00:00:00Z";
    const frozen = computeBaseline([...history, ...deviation], { ...options, frozenAt });
    assert.deepEqual(frozen, computeBaseline(history, { ...options, frozenAt }));
    assert.equal(frozen.status === "ready" && frozen.center, 61);
    assert.equal(frozen.status === "ready" && frozen.frozenAt, frozenAt);
    const unfrozen = computeBaseline([...history, ...deviation], options);
    assert.notEqual(unfrozen.status === "ready" && unfrozen.center, 61);
  });
});

describe("baselineDelta", () => {
  const baseline = computeBaseline(history, options);

  it("returns the raw and the normalized delta", () => {
    const result = baselineDelta(baseline, obs(20, 70));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.delta, 9);
    assert.ok(Math.abs((result.value.normalizedDelta ?? 0) - 9 / 1.4826) < 1e-9);
  });

  it("keeps the sign of a negative delta", () => {
    const result = baselineDelta(baseline, obs(20, 55));
    assert.equal(result.ok && result.value.delta, -6);
  });

  it("returns a null normalized delta when the baseline has no variability", () => {
    const flat = computeBaseline(
      [60, 60, 60, 60, 60].map((v, i) => obs(i + 1, v)),
      options,
    );
    const result = baselineDelta(flat, obs(20, 65));
    assert.equal(result.ok && result.value.delta, 5);
    assert.equal(result.ok && result.value.normalizedDelta, null);
  });

  it("refuses to compare against an insufficient baseline", () => {
    const insufficient = computeBaseline(history.slice(0, 2), options);
    const result = baselineDelta(insufficient, obs(20, 70));
    assert.deepEqual(result, { ok: false, error: "baseline-insufficient" });
  });

  it("refuses a non-evaluable observation", () => {
    const result = baselineDelta(baseline, obs(20, null));
    assert.deepEqual(result, { ok: false, error: "observation-not-evaluable" });
  });

  it("refuses an observation of another subject, signal or unit", () => {
    for (const extra of [{ subjectId: "b2" }, { signal: "hrv" }, { unit: "bps" }]) {
      assert.deepEqual(baselineDelta(baseline, obs(20, 70, extra)), {
        ok: false,
        error: "observation-mismatch",
      });
    }
  });
});
