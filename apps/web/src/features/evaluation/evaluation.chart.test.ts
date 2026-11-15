import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildChart } from "./evaluation.chart.ts";
import type { SignalView } from "./evaluation.types.ts";

const layout = { width: 100, height: 50, padX: 10, padY: 5 };

function view(overrides: Partial<SignalView> = {}): SignalView {
  return {
    signal: "hrv",
    label: "HRV",
    unit: "ms",
    provenance: { type: "synthetic", source: "sim" },
    baseline: {
      status: "ready",
      center: 50,
      variability: 5,
      sampleCount: 9,
      band: { low: 40, high: 60 },
    },
    latest: null,
    deviation: null,
    firedRuleIds: [],
    points: [
      { index: 0, observedAt: "a", value: 40, quality: "valid" },
      { index: 1, observedAt: "b", value: 50, quality: "valid" },
      { index: 2, observedAt: "c", value: null, quality: "missing" },
      { index: 3, observedAt: "d", value: 60, quality: "valid" },
      { index: 4, observedAt: "e", value: 70, quality: "valid" },
    ],
    totalPoints: 5,
    baselineEndIndex: 1,
    domain: { min: 30, max: 70 },
    ...overrides,
  };
}

describe("buildChart", () => {
  it("maps points into the padded area with higher values drawn higher", () => {
    const chart = buildChart(view(), layout);
    const [first, second, , last] = chart.dots;
    assert.equal(first.x, 10);
    assert.equal(last.x, 90);
    assert.ok(second.y < first.y);
    assert.equal(last.y, 5);
    assert.equal(first.y, 5 + (70 - 40) / (70 - 30) * 40);
  });

  it("breaks the line at a missing reading instead of drawing it as zero", () => {
    const chart = buildChart(view(), layout);
    assert.equal(chart.segments.length, 2);
    assert.equal(chart.dots.length, 4);
    assert.deepEqual(chart.gaps.map((g) => g.index), [2]);
    assert.equal(chart.gaps[0].x, 50);
  });

  it("draws an isolated reading as a dot without a segment", () => {
    const chart = buildChart(
      view({
        points: [
          { index: 0, observedAt: "a", value: 40, quality: "valid" },
          { index: 1, observedAt: "b", value: null, quality: "missing" },
          { index: 2, observedAt: "c", value: 50, quality: "valid" },
        ],
        totalPoints: 3,
      }),
      layout,
    );
    assert.deepEqual(chart.segments, []);
    assert.equal(chart.dots.length, 2);
  });

  it("places the baseline band between its limits and the baseline cut after the last baseline day", () => {
    const chart = buildChart(view(), layout);
    assert.ok(chart.band);
    assert.equal(chart.band.y, 5 + (70 - 60) / 40 * 40);
    assert.equal(chart.band.height, (60 - 40) / 40 * 40);
    assert.equal(chart.baselineCutX, 40);
  });

  it("omits the band when the baseline is insufficient", () => {
    const chart = buildChart(
      view({ baseline: { status: "insufficient", sampleCount: 3, minObservations: 5 } }),
      layout,
    );
    assert.equal(chart.band, null);
  });

  it("handles a single-point axis without dividing by zero", () => {
    const chart = buildChart(
      view({
        points: [{ index: 0, observedAt: "a", value: 50, quality: "valid" }],
        totalPoints: 1,
      }),
      layout,
    );
    assert.ok(Number.isFinite(chart.dots[0].x));
  });
});
