import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BIN_MS } from "../live/live.logic.ts";
import type { Observation } from "../observation/observation.types.ts";
import { translateLimitation } from "../evaluation/evaluation.labels.ts";
import { deriveEvaluation, shouldRaise, staleEvaluation, staleMinutes } from "./sentry.logic.ts";
import { blockStartsToEmit, SIM_SUBJECTS, syntheticHeartRate } from "./sentry.simulation.ts";

const T0 = 1_800_000_000_000 - (1_800_000_000_000 % BIN_MS);

function series(subject: string, blocks: number): Observation[] {
  return Array.from({ length: blocks }, (_, k) => syntheticHeartRate(subject, T0 + k * BIN_MS, T0));
}

describe("deriveEvaluation", () => {
  it("waits for calibration before evaluating", () => {
    assert.equal(deriveEvaluation(series("cm-01", 5)), null);
    assert.equal(deriveEvaluation(series("cm-01", 6)), null);
    assert.equal(deriveEvaluation([]), null);
  });

  it("keeps a calm member at F0 for the whole cycle", () => {
    for (const blocks of [7, 30, 120, 240]) {
      assert.equal(deriveEvaluation(series("cm-01", blocks))?.status, "F0");
    }
  });

  it("is deterministic for the same data", () => {
    assert.deepEqual(deriveEvaluation(series("cm-02", 50)), deriveEvaluation(series("cm-02", 50)));
  });

  it("reaches F2 on a sustained moderate deviation", () => {
    assert.equal(deriveEvaluation(series("cm-02", 36 + 6))?.status, "F2");
  });

  it("reaches F3 on a critical spike and recovers afterwards", () => {
    assert.equal(deriveEvaluation(series("cm-03", 92))?.status, "F3");
    assert.equal(deriveEvaluation(series("cm-03", 110))?.status, "F0");
  });

  it("marks simulated data as synthetic", () => {
    assert.equal(series("cm-04", 1)[0].provenance.type, "synthetic");
  });
});

describe("shouldRaise hysteresis", () => {
  const at = (min: number) => new Date(T0 + min * 60_000).toISOString();
  const now = T0 + 20 * 60_000;

  it("never raises F0 or F1", () => {
    assert.equal(shouldRaise("F0", [], now), false);
    assert.equal(shouldRaise("F1", [], now), false);
  });

  it("raises a first F2 and an escalation to F3", () => {
    assert.equal(shouldRaise("F2", [], now), true);
    assert.equal(shouldRaise("F3", [{ status: "F2", evaluatedAt: at(15) }], now), true);
  });

  it("does not re-raise a flapping F2 inside the window", () => {
    const history = [
      { status: "F1" as const, evaluatedAt: at(18) },
      { status: "F2" as const, evaluatedAt: at(10) },
    ];
    assert.equal(shouldRaise("F2", history, now), false);
  });

  it("does not re-raise a lower level after an F3", () => {
    assert.equal(shouldRaise("F2", [{ status: "F3", evaluatedAt: at(10) }], now), false);
  });

  it("raises again once the window has passed", () => {
    assert.equal(shouldRaise("F2", [{ status: "F2", evaluatedAt: at(-30) }], now), true);
  });
});

describe("simulator blocks", () => {
  it("starts about 35 s back and stops at the last closed block", () => {
    const now = T0 + 60_000 + 2_000;
    const starts = blockStartsToEmit(null, now);
    assert.equal(starts[0], T0 + 25_000);
    assert.equal(starts[starts.length - 1], T0 + 55_000);
  });

  it("resumes after the last stored block and caps catch-up", () => {
    const last = new Date(T0 + 5_000).toISOString();
    assert.equal(blockStartsToEmit(last, T0 + 60_000)[0], T0 + 5_000);
    assert.equal(blockStartsToEmit(last, T0 + 24 * 3_600_000).length, 60);
  });

  it("covers every crew member with a profile", () => {
    assert.deepEqual(SIM_SUBJECTS, ["cm-01", "cm-02", "cm-03", "cm-04"]);
  });
});

describe("stale evaluation", () => {
  it("is not evaluable with a readable limitation, never F0", () => {
    const evaluation = staleEvaluation("cm-02", T0);
    assert.equal(evaluation.status, "NOT_EVALUABLE");
    assert.deepEqual(evaluation.limitations, ["stale-data:heartRate"]);
    assert.equal(
      translateLimitation("stale-data:heartRate", 6).text,
      "Heart rate: no recent data.",
    );
  });

  it("counts whole minutes since the last observation", () => {
    assert.equal(staleMinutes(new Date(T0).toISOString(), T0 + 12 * 60_000 + 59_000), 12);
  });
});
