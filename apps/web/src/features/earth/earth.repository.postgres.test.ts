import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import type { Pool } from "pg";

import { createTestSchema, hasDirectDatabase } from "../../server/postgres.testing.ts";
import { earthStateSchema } from "./earth.schema.ts";
import { createPostgresEarthRepository, seedEarthState } from "./earth.repository.postgres.ts";

describe("postgres earth repository", { skip: !hasDirectDatabase }, () => {
  let pool: Pool;
  let drop: () => Promise<void>;
  before(async () => {
    ({ pool, drop } = await createTestSchema());
    const seed = earthStateSchema.parse(
      JSON.parse(await readFile(path.join(process.cwd(), "src", "features", "earth", "seed", "earth.json"), "utf-8")),
    );
    await seedEarthState(pool, seed);
    await seedEarthState(pool, { ...seed, nextSeq: 999 });
  });
  after(async () => {
    await drop();
  });

  it("seeds once and reads the state back", async () => {
    const state = await createPostgresEarthRepository(pool).read();
    assert.notEqual(state.nextSeq, 999);
    assert.ok(state.proposals.length >= 1);
  });

  it("serializes concurrent mutations", async () => {
    const repo = createPostgresEarthRepository(pool);
    const before = (await repo.read()).nextSeq;
    await Promise.all(
      Array.from({ length: 10 }, () =>
        repo.mutate((state) => ({ state: { ...state, nextSeq: state.nextSeq + 1 }, result: undefined })),
      ),
    );
    assert.equal((await repo.read()).nextSeq, before + 10);
  });

  it("rolls back and keeps the state when a mutation throws", async () => {
    const repo = createPostgresEarthRepository(pool);
    const before = await repo.read();
    await assert.rejects(
      repo.mutate(() => {
        throw new Error("boom");
      }),
    );
    assert.deepEqual(await repo.read(), before);
  });
});
