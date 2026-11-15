import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildObservations } from "./scenario.build.ts";
import { scenarioSchema } from "./scenario.schema.ts";

const raw = {
  id: "demo",
  title: "Demo",
  subjectId: "cm-01",
  startDate: "2026-11-01",
  baselineUntil: "2026-11-03T00:00:00Z",
  checkpoints: [{ label: "end", evaluatedAt: "2026-11-05T00:00:00Z" }],
  series: [
    { signal: "hrv", unit: "ms", source: "wearable-sim", device: "watch-sim", values: [50, null, 48] },
    { signal: "fatigue", unit: "score", source: "self-report", values: [3] },
  ],
};

describe("scenario schema", () => {
  it("accepts a valid scenario", () => {
    assert.ok(scenarioSchema.safeParse(raw).success);
  });

  it("rejects an empty series list, an empty values list and a bad start date", () => {
    assert.equal(scenarioSchema.safeParse({ ...raw, series: [] }).success, false);
    assert.equal(
      scenarioSchema.safeParse({ ...raw, series: [{ ...raw.series[0], values: [] }] }).success,
      false,
    );
    assert.equal(scenarioSchema.safeParse({ ...raw, startDate: "01/11/2026" }).success, false);
  });

  it("rejects a scenario without checkpoints", () => {
    assert.equal(scenarioSchema.safeParse({ ...raw, checkpoints: [] }).success, false);
  });
});

describe("buildObservations", () => {
  const observations = buildObservations(scenarioSchema.parse(raw));

  it("expands every value into one observation per consecutive day", () => {
    const hrv = observations.filter((o) => o.signal === "hrv");
    assert.deepEqual(
      hrv.map((o) => o.observedAt),
      ["2026-11-01T08:00:00Z", "2026-11-02T08:00:00Z", "2026-11-03T08:00:00Z"],
    );
    assert.equal(observations.length, 4);
  });

  it("gives every observation a unique id and the scenario subject", () => {
    assert.equal(new Set(observations.map((o) => o.id)).size, observations.length);
    assert.ok(observations.every((o) => o.subjectId === "cm-01"));
  });

  it("declares every observation as synthetic and keeps source and device", () => {
    assert.ok(observations.every((o) => o.provenance.type === "synthetic"));
    const hrv = observations[0];
    assert.equal(hrv.provenance.source, "wearable-sim");
    assert.equal(hrv.provenance.device, "watch-sim");
    const fatigue = observations.find((o) => o.signal === "fatigue");
    assert.equal(fatigue?.provenance.source, "self-report");
    assert.equal(fatigue?.provenance.device, undefined);
  });

  it("turns a null value into a missing observation, never into zero", () => {
    const gap = observations.find((o) => o.id.endsWith("hrv-1"));
    assert.equal(gap?.value, null);
    assert.deepEqual(gap?.quality, { state: "missing", reason: "sensor-unavailable" });
  });

  it("marks present values as valid", () => {
    assert.deepEqual(observations[0].quality, { state: "valid" });
  });

  it("is deterministic", () => {
    assert.deepEqual(buildObservations(scenarioSchema.parse(raw)), observations);
  });
});
