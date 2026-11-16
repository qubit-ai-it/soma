import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  areaPath,
  chartDomain,
  linePath,
  rangeStatus,
  referenceBand,
  scaleSeries,
  scaleY,
} from "./crew.chart.ts";

const box = { width: 200, height: 100, padX: 10, padY: 10 };

describe("chartDomain", () => {
  it("covers the readings and the reference range, with a margin", () => {
    const domain = chartDomain([70, 80], { low: 60, high: 100 });
    assert.ok(domain.min < 60 && domain.max > 100);
  });

  it("widens a flat series instead of dividing by zero", () => {
    assert.deepEqual(chartDomain([5, 5]), { min: 4, max: 6 });
  });

  it("has a default for no data", () => {
    assert.deepEqual(chartDomain([]), { min: 0, max: 1 });
  });
});

describe("scaling", () => {
  const domain = { min: 0, max: 10 };

  it("puts the highest value at the top and the lowest at the bottom, inside the padding", () => {
    assert.equal(scaleY(10, domain, box), 10);
    assert.equal(scaleY(0, domain, box), 90);
  });

  it("spreads the points across the width and centres a lone point", () => {
    const points = scaleSeries([1, 2, 3], domain, box);
    assert.deepEqual(points.map((p) => p.x), [10, 100, 190]);
    assert.equal(scaleSeries([4], domain, box)[0].x, 100);
  });
});

describe("paths", () => {
  const points = [
    { x: 10, y: 50 },
    { x: 100, y: 20 },
  ];

  it("draws a line through the points", () => {
    assert.equal(linePath(points), "M10.0 50.0 L100.0 20.0");
  });

  it("closes the area down to the floor of the chart", () => {
    assert.equal(areaPath(points, box), "M10.0 50.0 L100.0 20.0 L100.0 90.0 L10.0 90.0 Z");
    assert.equal(areaPath([], box), "");
  });
});

describe("referenceBand", () => {
  const domain = { min: 0, max: 10 };

  it("spans the reference range", () => {
    const band = referenceBand({ low: 2, high: 8 }, domain, box);
    assert.ok(band && band.height > 0 && band.y >= 10);
  });

  it("runs to the edge when one end is open", () => {
    const band = referenceBand({ low: 6 }, domain, box);
    assert.equal(band?.y, 10);
  });

  it("has no band without a range", () => {
    assert.equal(referenceBand({}, domain, box), null);
  });
});

describe("rangeStatus", () => {
  it("flags a value below, inside or above the range, including open ends", () => {
    assert.equal(rangeStatus(50, { low: 60, high: 100 }), "low");
    assert.equal(rangeStatus(80, { low: 60, high: 100 }), "normal");
    assert.equal(rangeStatus(120, { low: 60, high: 100 }), "high");
    assert.equal(rangeStatus(5, { low: 6 }), "low");
    assert.equal(rangeStatus(99, { low: 94 }), "normal");
  });
});
