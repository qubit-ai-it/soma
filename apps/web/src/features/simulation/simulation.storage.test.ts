import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMemoryStorage } from "./simulation.storage.ts";

describe("memory simulation storage", () => {
  it("starts from the initial state once and shares it between callers", async () => {
    let created = 0;
    const storage = createMemoryStorage(async () => ({ count: ++created }));
    assert.deepEqual(await storage.update((state) => state), { count: 1 });
    assert.deepEqual(await storage.update((state) => ({ count: state.count + 10 })), { count: 11 });
    assert.deepEqual(await storage.update((state) => state), { count: 11 });
    assert.equal(created, 1);
  });

  it("runs concurrent updates one after another without losing any", async () => {
    const storage = createMemoryStorage(async () => ({ count: 0 }));
    await Promise.all(
      Array.from({ length: 20 }, () =>
        storage.update(async (state) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return { count: state.count + 1 };
        }),
      ),
    );
    assert.deepEqual(await storage.update((state) => state), { count: 20 });
  });

  it("keeps working after an update throws", async () => {
    const storage = createMemoryStorage(async () => ({ count: 0 }));
    await assert.rejects(storage.update(() => { throw new Error("boom"); }), /boom/);
    assert.deepEqual(await storage.update((state) => ({ count: state.count + 1 })), { count: 1 });
  });
});
