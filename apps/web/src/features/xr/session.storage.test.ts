import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { startSession } from "./procedure.machine.ts";
import type { Procedure } from "./procedure.types.ts";
import { scopedKey } from "../settings/scope.logic.ts";
import { clearStoredSession, loadStoredSession, saveSession, SESSION_KEY } from "./session.storage.ts";

const procedure: Procedure = {
  id: "demo",
  title: "Demo",
  steps: [
    { id: "a", title: "A", instruction: "a", optional: false },
    { id: "b", title: "B", instruction: "b", optional: true },
  ],
};

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const AT = "2026-11-15T10:00:00.000Z";

describe("session storage", () => {
  it("round-trips a saved session", () => {
    const storage = memoryStorage();
    const state = startSession(procedure, "live", AT);
    saveSession(storage, state);
    assert.deepEqual(loadStoredSession(storage, procedure), state);
  });

  it("returns null when nothing is stored", () => {
    assert.equal(loadStoredSession(memoryStorage(), procedure), null);
  });

  it("falls back to null on corrupt JSON", () => {
    assert.equal(loadStoredSession(memoryStorage({ [scopedKey(SESSION_KEY, "guest")]: "{not json" }), procedure), null);
  });

  it("falls back to null when the shape is invalid", () => {
    const storage = memoryStorage({ [scopedKey(SESSION_KEY, "guest")]: JSON.stringify({ hello: "world" }) });
    assert.equal(loadStoredSession(storage, procedure), null);
  });

  it("falls back to null when the session belongs to another procedure", () => {
    const other: Procedure = { ...procedure, id: "other" };
    const storage = memoryStorage();
    saveSession(storage, startSession(other, "practice", AT));
    assert.equal(loadStoredSession(storage, procedure), null);
  });

  it("falls back to null when the step count no longer matches", () => {
    const storage = memoryStorage();
    saveSession(storage, startSession(procedure, "practice", AT));
    const longer: Procedure = {
      ...procedure,
      steps: [...procedure.steps, { id: "c", title: "C", instruction: "c", optional: false }],
    };
    assert.equal(loadStoredSession(storage, longer), null);
  });

  it("returns null without storage and does not throw when storage fails", () => {
    assert.equal(loadStoredSession(null, procedure), null);
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    assert.equal(loadStoredSession(broken, procedure), null);
    assert.doesNotThrow(() => saveSession(broken, startSession(procedure, "practice", AT)));
    assert.doesNotThrow(() => clearStoredSession(broken));
  });

  it("keeps each user's session apart", () => {
    const storage = memoryStorage();
    const state = startSession(procedure, "live", AT);
    saveSession(storage, state, "user_a");
    assert.deepEqual(loadStoredSession(storage, procedure, "user_a"), state);
    assert.equal(loadStoredSession(storage, procedure, "user_b"), null);
    assert.equal(loadStoredSession(storage, procedure), null);
    clearStoredSession(storage, "user_b");
    assert.deepEqual(loadStoredSession(storage, procedure, "user_a"), state);
  });

  it("clears the stored session", () => {
    const storage = memoryStorage();
    saveSession(storage, startSession(procedure, "practice", AT));
    clearStoredSession(storage);
    assert.equal(loadStoredSession(storage, procedure), null);
  });
});
