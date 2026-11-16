import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { memberIdForUser } from "./crew.member-id.ts";
import { createMemoryCrewRepository } from "./crew.repository.memory.ts";

const NOW = () => new Date("2026-11-16T12:00:00Z");

describe("memory crew repository", () => {
  it("starts empty: there is no mock crew", async () => {
    assert.deepEqual(await createMemoryCrewRepository(NOW).list(), []);
  });

  it("creates one member per user with the user's own name and a stable id", async () => {
    const repo = createMemoryCrewRepository(NOW);
    const input = { userId: "user_abc", firstName: "Ana", lastName: "Lopez", role: "astronaut" as const };
    const first = await repo.ensure(input);
    const again = await repo.ensure(input);
    assert.deepEqual(again, first);
    assert.equal(first.name, "Ana Lopez");
    assert.equal(first.id, memberIdForUser("user_abc"));
    assert.deepEqual(await repo.list(), [first]);
    assert.deepEqual(await repo.getByUser("user_abc"), first);
    assert.deepEqual(await repo.get(first.id), first);
  });

  it("keeps members of different users apart", async () => {
    const repo = createMemoryCrewRepository(NOW);
    const a = await repo.ensure({ userId: "user_a", firstName: "A", lastName: "One", role: "astronaut" });
    const b = await repo.ensure({ userId: "user_b", firstName: "B", lastName: "Two", role: "commander" });
    assert.notEqual(a.id, b.id);
    assert.equal((await repo.list()).length, 2);
    assert.equal(await repo.getByUser("user_c"), null);
  });
});
