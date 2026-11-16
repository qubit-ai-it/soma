import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { startSession } from "./procedure.machine.ts";
import type { Procedure } from "./procedure.types.ts";
import {
  applyAction,
  canSwitchMode,
  describeMachineError,
  isCaptureStep,
} from "./session.flow.ts";

const procedure: Procedure = {
  id: "demo",
  title: "Demo",
  steps: [
    { id: "a", title: "A", instruction: "a", optional: false },
    { id: "capture-image", title: "Capture", instruction: "c", optional: true },
    { id: "z", title: "Z", instruction: "z", optional: false },
  ],
};
const AT = "2026-11-15T10:00:00.000Z";

describe("applyAction", () => {
  it("completes the current step", () => {
    const state = startSession(procedure, "practice", AT);
    const result = applyAction(procedure, state, { type: "complete" }, AT);
    assert.ok(result.ok);
    assert.equal(result.value.currentIndex, 1);
  });

  it("rejects skipping a required step with a clear message", () => {
    const state = startSession(procedure, "practice", AT);
    const result = applyAction(procedure, state, { type: "skip" }, AT);
    assert.ok(!result.ok);
    assert.equal(result.error, "step-not-skippable");
    assert.match(describeMachineError(result.error), /optional/);
  });

  it("fails a step with a note", () => {
    const state = startSession(procedure, "live", AT);
    const result = applyAction(procedure, state, { type: "fail", note: "borroso" }, AT);
    assert.ok(result.ok);
    assert.equal(result.value.statuses[0], "failed");
    assert.equal(result.value.log.at(-1)?.note, "borroso");
  });

  it("goes back, aborts and resets in practice", () => {
    const first = applyAction(procedure, startSession(procedure, "practice", AT), { type: "complete" }, AT);
    assert.ok(first.ok);
    const state = first.value;
    const back = applyAction(procedure, state, { type: "back" }, AT);
    assert.ok(back.ok && back.value.currentIndex === 0);
    const aborted = applyAction(procedure, state, { type: "abort" }, AT);
    assert.ok(aborted.ok && aborted.value.phase === "aborted");
    const reset = applyAction(procedure, state, { type: "reset" }, AT);
    assert.ok(reset.ok && reset.value.currentIndex === 0);
  });

  it("refuses to reset a live session", () => {
    const state = startSession(procedure, "live", AT);
    const result = applyAction(procedure, state, { type: "reset" }, AT);
    assert.ok(!result.ok);
    assert.equal(result.error, "reset-not-allowed-in-live");
  });
});

describe("isCaptureStep", () => {
  it("is true only for an in-progress capture step", () => {
    const state = startSession(procedure, "practice", AT);
    assert.equal(isCaptureStep(procedure, state), false);
    assert.equal(isCaptureStep(procedure, { ...state, currentIndex: 1 }), true);
    assert.equal(isCaptureStep(procedure, { ...state, currentIndex: 1, phase: "aborted" }), false);
  });
});

describe("canSwitchMode", () => {
  it("allows switching from practice, and from a closed live session", () => {
    assert.equal(canSwitchMode(startSession(procedure, "practice", AT)), true);
    const live = startSession(procedure, "live", AT);
    assert.equal(canSwitchMode(live), false);
    assert.equal(canSwitchMode({ ...live, phase: "aborted" }), true);
    assert.equal(canSwitchMode({ ...live, phase: "completed" }), true);
  });
});
