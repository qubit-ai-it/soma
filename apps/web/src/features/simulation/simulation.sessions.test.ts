import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createSessionStore } from "./simulation.sessions.ts";

describe("simulation sessions", () => {
  it("starts each visit clean and keeps changes separate", async () => {
    const store = createSessionStore(async () => ({ position: 17, messages: [] as string[] }));

    await store.update("visit-a", (state) => ({ position: 80, messages: [...state.messages, "alert"] }));

    assert.deepEqual(await store.read("visit-a"), { position: 80, messages: ["alert"] });
    assert.deepEqual(await store.read("visit-b"), { position: 17, messages: [] });
  });

  it("serializes changes within one visit", async () => {
    const store = createSessionStore(async () => ({ count: 0 }));
    await Promise.all(Array.from({ length: 20 }, () => store.update("visit-a", async (state) => {
      await Promise.resolve();
      return { count: state.count + 1 };
    })));
    assert.equal((await store.read("visit-a")).count, 20);
  });
});
