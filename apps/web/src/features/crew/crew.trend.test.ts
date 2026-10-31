import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeTrend, vitalTrends } from "./crew.trend.ts";

describe("computeTrend", () => {
  it("reports rising when the last value exceeds the first beyond tolerance", () => {
    assert.equal(computeTrend([60, 64, 70], 3), "rising");
  });

  it("reports falling when the last value is below the first beyond tolerance", () => {
    assert.equal(computeTrend([98, 96, 93], 1), "falling");
  });

  it("reports stable when the change is within tolerance", () => {
    assert.equal(computeTrend([7, 7.2, 7.3], 0.5), "stable");
    assert.equal(computeTrend([60, 63, 60], 3), "stable");
  });

  it("reports insufficient data under 3 samples", () => {
    assert.equal(computeTrend([], 1), "insufficient");
    assert.equal(computeTrend([5, 9], 1), "insufficient");
  });
});

describe("vitalTrends", () => {
  const history = [
    { at: "2026-10-27T06:00:00Z", heartRateBpm: 60, spo2Pct: 98, sleepHours: 7 },
    { at: "2026-10-28T06:00:00Z", heartRateBpm: 66, spo2Pct: 97, sleepHours: 6.2 },
    { at: "2026-10-29T06:00:00Z", heartRateBpm: 72, spo2Pct: 97, sleepHours: 5.1 },
  ];

  it("derives one trend per signal", () => {
    assert.deepEqual(vitalTrends(history), {
      heartRate: "rising",
      spo2: "stable",
      sleep: "falling",
    });
  });

  it("orders samples by timestamp before comparing", () => {
    assert.equal(vitalTrends([...history].reverse()).heartRate, "rising");
  });

  it("returns insufficient for every signal without history", () => {
    assert.deepEqual(vitalTrends(undefined), {
      heartRate: "insufficient",
      spo2: "insufficient",
      sleep: "insufficient",
    });
  });
});
