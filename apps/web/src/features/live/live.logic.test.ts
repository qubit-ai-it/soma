import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BIN_MS,
  LIVE_CALIBRATION_BINS,
  binReadings,
  evaluateLive,
  type Reading,
} from "./live.logic.ts";

const T0 = Date.parse("2026-11-20T10:00:00Z");

// five readings per bin, median equal to the bin value
function bins(values: number[], startBin = 0): Reading[] {
  return values.flatMap((value, i) =>
    [-1, 0, 1, 0, 0].map((offset, k) => ({
      at: T0 + (startBin + i) * BIN_MS + k * 1000,
      bpm: value + offset,
    })),
  );
}

const BASELINE = [70, 72, 71, 73, 69, 72];
const endOfBin = (n: number) => T0 + n * BIN_MS;
const run = (values: number[], completeBins = values.length) =>
  evaluateLive(bins(values), "Banda de pecho", endOfBin(completeBins));

describe("binReadings", () => {
  it("takes the median of each complete bin", () => {
    const result = binReadings(bins([70, 80]), endOfBin(2));
    assert.deepEqual(
      result.map((b) => b.bpm),
      [70, 80],
    );
  });

  it("leaves out a bin that is still open", () => {
    assert.equal(binReadings(bins([70, 80]), endOfBin(1)).length, 1);
  });

  it("returns nothing without readings", () => {
    assert.deepEqual(binReadings([], T0), []);
  });
});

describe("evaluateLive phases", () => {
  it("waits for the first readings", () => {
    const result = evaluateLive([], "x", T0);
    assert.equal(result.phase, "waiting");
    assert.equal(result.evaluation, null);
    assert.equal(result.latestBpm, null);
  });

  it("calibrates until it has the minimum number of bins", () => {
    const result = run(BASELINE.slice(0, 3));
    assert.equal(result.phase, "calibrating");
    assert.equal(result.binsCount, 3);
    assert.equal(result.calibrationBins, LIVE_CALIBRATION_BINS);
    assert.equal(result.evaluation, null);
  });

  it("reports the latest raw reading", () => {
    const result = run(BASELINE);
    assert.equal(result.latestBpm, 72);
  });
});

describe("evaluateLive status", () => {
  it("has no data to judge right after calibration, and that is not F0", () => {
    const result = run(BASELINE);
    assert.equal(result.phase, "live");
    assert.equal(result.evaluation?.status, "NOT_EVALUABLE");
  });

  it("stays F0 within the personal reference", () => {
    assert.equal(run([...BASELINE, 72]).evaluation?.status, "F0");
  });

  it("raises F1 for a reading above the reference", () => {
    const result = run([...BASELINE, 78]);
    assert.equal(result.evaluation?.status, "F1");
    assert.deepEqual(result.evaluation?.triggeredRules, ["hr-high"]);
  });

  it("raises F2 when the deviation persists", () => {
    const result = run([...BASELINE, 78, 79, 80]);
    assert.equal(result.evaluation?.status, "F2");
    assert.ok(result.evaluation?.triggeredRules.includes("hr-high-persistent"));
  });

  it("raises F3 for a far deviation", () => {
    assert.equal(run([...BASELINE, 90]).evaluation?.status, "F3");
  });

  it("does not use an implausible reading as evidence", () => {
    const result = run([...BASELINE, 300]);
    assert.equal(result.evaluation?.status, "NOT_EVALUABLE");
  });

  it("does not count an open bin", () => {
    const result = evaluateLive(bins([...BASELINE, 90]), "x", endOfBin(BASELINE.length));
    assert.equal(result.evaluation?.status, "NOT_EVALUABLE");
  });

  it("is deterministic for the same readings and time", () => {
    const a = run([...BASELINE, 78]);
    const b = evaluateLive([...bins([...BASELINE, 78])].reverse(), "Banda de pecho", endOfBin(7));
    assert.deepEqual(a, b);
  });
});
