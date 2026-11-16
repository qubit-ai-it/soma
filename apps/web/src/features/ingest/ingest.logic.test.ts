import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { blockStart, toBlockObservations } from "./ingest.logic.ts";
import { ingestBodySchema } from "./ingest.schema.ts";

const T0 = 1_700_000_000_000 - (1_700_000_000_000 % 5000);
const body = (readings: { at: number; bpm: number }[]) =>
  ingestBodySchema.parse({ subjectId: "live-astronaut", device: "Watch", readings });

describe("ingest block observations", () => {
  it("collapses a 5 s block into its median with real provenance", () => {
    const obs = toBlockObservations(
      body([
        { at: T0 + 100, bpm: 70 },
        { at: T0 + 1500, bpm: 74 },
        { at: T0 + 3000, bpm: 90 },
      ]),
      T0 + 20_000,
    );
    assert.equal(obs.length, 1);
    assert.equal(obs[0].value, 74);
    assert.equal(obs[0].observedAt, new Date(T0 + 5000).toISOString());
    assert.deepEqual(obs[0].provenance, { type: "real", source: "Web Bluetooth", device: "Watch" });
  });

  it("ids are deterministic so retries do not duplicate", () => {
    const a = toBlockObservations(body([{ at: T0 + 10, bpm: 70 }]), T0 + 20_000);
    const b = toBlockObservations(body([{ at: T0 + 4000, bpm: 71 }]), T0 + 20_000);
    assert.equal(a[0].id, b[0].id);
    assert.equal(a[0].id, `hr-live-astronaut-${blockStart(T0 + 10)}`);
  });

  it("skips a block that has not closed yet", () => {
    const obs = toBlockObservations(body([{ at: T0 + 100, bpm: 70 }]), T0 + 3000);
    assert.deepEqual(obs, []);
  });

  it("marks an implausible value invalid instead of dropping or fixing it", () => {
    const obs = toBlockObservations(body([{ at: T0 + 100, bpm: 0 }]), T0 + 20_000);
    assert.equal(obs[0].quality.state, "invalid");
    assert.equal(obs[0].quality.reason, "out-of-range");
    assert.equal(obs[0].value, 0);
  });

  it("splits readings into one observation per block in order", () => {
    const obs = toBlockObservations(
      body([
        { at: T0 + 6000, bpm: 80 },
        { at: T0 + 100, bpm: 70 },
      ]),
      T0 + 30_000,
    );
    assert.deepEqual(obs.map((o) => o.value), [70, 80]);
  });

  it("rejects malformed bodies", () => {
    assert.equal(ingestBodySchema.safeParse({ subjectId: "X", device: "w", readings: [] }).success, false);
    assert.equal(
      ingestBodySchema.safeParse({ subjectId: "live-astronaut", device: "w", readings: [{ at: 1, bpm: Infinity }] }).success,
      false,
    );
  });
});
