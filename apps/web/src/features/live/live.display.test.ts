import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BIN_MS, evaluateLive, type Reading } from "./live.logic.ts";
import { describeLive } from "./live.display.ts";

const T0 = Date.parse("2026-11-20T10:00:00Z");

function bins(values: number[]): Reading[] {
  return values.flatMap((value, i) =>
    [-1, 0, 1, 0, 0].map((offset, k) => ({ at: T0 + i * BIN_MS + k * 1000, bpm: value + offset })),
  );
}

const BASELINE = [70, 72, 71, 73, 69, 72];
const live = (values: number[]) => evaluateLive(bins(values), "x", T0 + values.length * BIN_MS);

describe("describeLive", () => {
  it("asks to connect a device when nothing is connected", () => {
    const view = describeLive(evaluateLive([], "x", T0), false);
    assert.deepEqual([view.chip, view.tone], ["Disconnected", "neutral"]);
  });

  it("waits for readings once connected", () => {
    assert.equal(describeLive(evaluateLive([], "x", T0), true).chip, "Waiting");
  });

  it("shows the calibration progress", () => {
    const view = describeLive(live(BASELINE.slice(0, 2)), true);
    assert.equal(view.chip, "Calibrating 2/6");
  });

  it("maps each status to a tone and a short line", () => {
    assert.deepEqual(describeLive(live([...BASELINE, 72]), true).tone, "ok");
    assert.deepEqual(describeLive(live([...BASELINE, 78]), true).tone, "warn");
    assert.deepEqual(describeLive(live([...BASELINE, 78, 79, 80]), true).chip, "F2");
    const f3 = describeLive(live([...BASELINE, 90]), true);
    assert.deepEqual([f3.chip, f3.tone], ["F3", "danger"]);
  });

  it("says why it cannot evaluate, and never calls it F0", () => {
    const noData = describeLive(live(BASELINE), true);
    assert.equal(noData.chip, "Not evaluable");
    assert.notEqual(noData.chip, "F0");

    const flat = describeLive(live([70, 70, 70, 70, 70, 70, 75]), true);
    assert.equal(flat.chip, "Not evaluable");
  });

  it("keeps every line short", () => {
    const views = [
      describeLive(evaluateLive([], "x", T0), false),
      describeLive(live([...BASELINE, 72]), true),
      describeLive(live([...BASELINE, 90]), true),
      describeLive(live(BASELINE), true),
    ];
    for (const view of views) assert.ok(view.line.split(/\s+/).length <= 10, view.line);
  });
});
