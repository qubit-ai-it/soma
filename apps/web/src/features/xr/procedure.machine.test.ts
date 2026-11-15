import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  abortSession,
  completeStep,
  failStep,
  goBack,
  resetSession,
  restoreSession,
  skipStep,
  startSession,
} from "./procedure.machine.ts";
import { procedureSchema } from "./procedure.schema.ts";
import type { SessionState } from "./procedure.types.ts";

const procedure = procedureSchema.parse({
  id: "p1",
  title: "Demo procedure",
  steps: [
    { id: "s1", title: "One", instruction: "Do one." },
    { id: "s2", title: "Two", instruction: "Do two.", optional: true },
    { id: "s3", title: "Three", instruction: "Do three." },
  ],
});

const T = (n: number) => `2026-11-15T10:0${n}:00Z`;

function unwrap(result: { ok: true; value: SessionState } | { ok: false; error: string }) {
  assert.ok(result.ok, result.ok ? "" : result.error);
  return result.value;
}

describe("startSession", () => {
  it("starts on the first step with every step pending", () => {
    const state = startSession(procedure, "practice", T(0));
    assert.equal(state.currentIndex, 0);
    assert.deepEqual(state.statuses, ["pending", "pending", "pending"]);
    assert.equal(state.phase, "in-progress");
    assert.equal(state.mode, "practice");
    assert.equal(state.procedureId, "p1");
  });
});

describe("completeStep", () => {
  it("marks the step done and advances", () => {
    const state = unwrap(completeStep(procedure, startSession(procedure, "live", T(0)), T(1)));
    assert.deepEqual(state.statuses, ["done", "pending", "pending"]);
    assert.equal(state.currentIndex, 1);
    assert.equal(state.phase, "in-progress");
  });

  it("completes the session on the last step", () => {
    let state = startSession(procedure, "live", T(0));
    state = unwrap(completeStep(procedure, state, T(1)));
    state = unwrap(skipStep(procedure, state, T(2)));
    state = unwrap(completeStep(procedure, state, T(3)));
    assert.equal(state.phase, "completed");
    assert.deepEqual(state.statuses, ["done", "skipped", "done"]);
  });

  it("refuses to act on a closed session", () => {
    let state = startSession(procedure, "live", T(0));
    state = unwrap(abortSession(procedure, state, T(1)));
    assert.deepEqual(completeStep(procedure, state, T(2)), { ok: false, error: "session-closed" });
    assert.deepEqual(skipStep(procedure, state, T(2)), { ok: false, error: "session-closed" });
    assert.deepEqual(failStep(procedure, state, T(2)), { ok: false, error: "session-closed" });
  });
});

describe("skipStep", () => {
  it("skips an optional step", () => {
    let state = startSession(procedure, "practice", T(0));
    state = unwrap(completeStep(procedure, state, T(1)));
    state = unwrap(skipStep(procedure, state, T(2)));
    assert.deepEqual(state.statuses, ["done", "skipped", "pending"]);
    assert.equal(state.currentIndex, 2);
  });

  it("refuses to skip a required step", () => {
    const result = skipStep(procedure, startSession(procedure, "practice", T(0)), T(1));
    assert.deepEqual(result, { ok: false, error: "step-not-skippable" });
  });
});

describe("failStep", () => {
  it("marks the step failed and stays on it until it is retried", () => {
    let state = startSession(procedure, "live", T(0));
    state = unwrap(failStep(procedure, state, T(1), "image-unclear"));
    assert.deepEqual(state.statuses, ["failed", "pending", "pending"]);
    assert.equal(state.currentIndex, 0);
    state = unwrap(completeStep(procedure, state, T(2)));
    assert.deepEqual(state.statuses, ["done", "pending", "pending"]);
    assert.equal(state.currentIndex, 1);
  });
});

describe("goBack", () => {
  it("returns to the previous step and reopens it", () => {
    let state = startSession(procedure, "practice", T(0));
    state = unwrap(completeStep(procedure, state, T(1)));
    state = unwrap(goBack(procedure, state, T(2)));
    assert.equal(state.currentIndex, 0);
    assert.deepEqual(state.statuses, ["pending", "pending", "pending"]);
  });

  it("refuses to go back from the first step", () => {
    const result = goBack(procedure, startSession(procedure, "practice", T(0)), T(1));
    assert.deepEqual(result, { ok: false, error: "already-at-first-step" });
  });

  it("reopens the last step of a completed session", () => {
    let state = startSession(procedure, "practice", T(0));
    state = unwrap(completeStep(procedure, state, T(1)));
    state = unwrap(skipStep(procedure, state, T(2)));
    state = unwrap(completeStep(procedure, state, T(3)));
    state = unwrap(goBack(procedure, state, T(4)));
    assert.equal(state.phase, "in-progress");
    assert.equal(state.currentIndex, 2);
    assert.equal(state.statuses[2], "pending");
  });
});

describe("practice versus live", () => {
  it("records nothing in practice mode", () => {
    let state = startSession(procedure, "practice", T(0));
    state = unwrap(completeStep(procedure, state, T(1)));
    state = unwrap(failStep(procedure, state, T(2)));
    assert.deepEqual(state.log, []);
  });

  it("records every action in live mode with its step and time", () => {
    let state = startSession(procedure, "live", T(0));
    state = unwrap(completeStep(procedure, state, T(1)));
    state = unwrap(failStep(procedure, state, T(2), "unclear"));
    state = unwrap(completeStep(procedure, state, T(3)));
    assert.deepEqual(
      state.log.map((e) => [e.action, e.stepId ?? null, e.at]),
      [
        ["started", null, T(0)],
        ["completed", "s1", T(1)],
        ["failed", "s2", T(2)],
        ["completed", "s2", T(3)],
      ],
    );
  });

  it("records the finish and the abort in live mode", () => {
    let done = startSession(procedure, "live", T(0));
    done = unwrap(completeStep(procedure, done, T(1)));
    done = unwrap(skipStep(procedure, done, T(2)));
    done = unwrap(completeStep(procedure, done, T(3)));
    assert.equal(done.log.at(-1)?.action, "finished");

    const aborted = unwrap(abortSession(procedure, startSession(procedure, "live", T(0)), T(1)));
    assert.equal(aborted.phase, "aborted");
    assert.equal(aborted.log.at(-1)?.action, "aborted");
  });

  it("keeps the failure note in the live log", () => {
    const state = unwrap(
      failStep(procedure, startSession(procedure, "live", T(0)), T(1), "image-unclear"),
    );
    assert.equal(state.log.at(-1)?.note, "image-unclear");
  });

  it("lets practice restart but refuses to reset a live session", () => {
    let practice = startSession(procedure, "practice", T(0));
    practice = unwrap(completeStep(procedure, practice, T(1)));
    const reset = unwrap(resetSession(procedure, practice, T(2)));
    assert.deepEqual(reset, startSession(procedure, "practice", T(2)));

    const live = startSession(procedure, "live", T(0));
    assert.deepEqual(resetSession(procedure, live, T(1)), {
      ok: false,
      error: "reset-not-allowed-in-live",
    });
  });
});

describe("purity and persistence", () => {
  it("never mutates the state it receives", () => {
    const state = startSession(procedure, "live", T(0));
    const snapshot = JSON.stringify(state);
    completeStep(procedure, state, T(1));
    failStep(procedure, state, T(1));
    abortSession(procedure, state, T(1));
    assert.equal(JSON.stringify(state), snapshot);
  });

  it("restores a session from its JSON form", () => {
    let state = startSession(procedure, "live", T(0));
    state = unwrap(completeStep(procedure, state, T(1)));
    const restored = restoreSession(JSON.parse(JSON.stringify(state)), procedure);
    assert.deepEqual(restored, { ok: true, value: state });
  });

  it("rejects a persisted session that does not match the procedure", () => {
    const state = startSession(procedure, "live", T(0));
    const bad = [
      { ...state, procedureId: "other" },
      { ...state, statuses: ["pending"] },
      { ...state, currentIndex: 9 },
      { ...state, phase: "unknown" },
      "not-a-session",
    ];
    for (const raw of bad) {
      assert.deepEqual(restoreSession(raw, procedure), { ok: false, error: "invalid-session" });
    }
  });
});
