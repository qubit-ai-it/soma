import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import type { Pool } from "pg";

import { err, ok } from "../../shared/result.ts";
import { createTestSchema, hasDirectDatabase } from "../../server/postgres.testing.ts";
import { submitForReview } from "./plan.lifecycle.ts";
import type { PlanRecord } from "./plan.record.ts";
import { createPostgresPlansRepository } from "./plan.repository.postgres.ts";

const plan = (id: string, evaluationId: string, over: Partial<PlanRecord> = {}): PlanRecord => ({
  id,
  subjectId: "cm-02",
  evaluationId,
  level: "F2",
  status: "draft",
  revision: 1,
  steps: ["Step 1", "Step 2"],
  uncertainty: "Unvalidated",
  source: { provider: "ollama", mode: "live" },
  concerns: ["HRV baja"],
  reviews: [],
  createdAt: "2026-11-16T10:00:00.000Z",
  updatedAt: "2026-11-16T10:00:00.000Z",
  ...over,
});

describe("postgres plans repository", { skip: !hasDirectDatabase }, () => {
  let pool: Pool;
  let drop: () => Promise<void>;
  before(async () => {
    ({ pool, drop } = await createTestSchema());
  });
  after(async () => {
    await drop();
  });

  it("adds idempotently by evaluation and round-trips every field", async () => {
    const repo = createPostgresPlansRepository(pool);
    const first = await repo.add(plan("pl-1", "ev-1"));
    const second = await repo.add(plan("pl-other", "ev-1"));
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(second.plan.id, "pl-1");
    assert.deepEqual(await repo.get("pl-1"), plan("pl-1", "ev-1"));
    assert.equal(await repo.get("nope"), null);
  });

  it("finds the active plan of a subject and ignores decided ones", async () => {
    const repo = createPostgresPlansRepository(pool);
    assert.equal((await repo.activeForSubject("cm-02"))?.id, "pl-1");
    await repo.update("pl-1", (p) =>
      ok({ ...p, status: "approved", decided: { via: "board", role: "cmo", actorId: "demo-cmo-01", at: "2026-11-16T11:00:00.000Z" } }),
    );
    assert.equal(await repo.activeForSubject("cm-02"), null);
    assert.equal((await repo.latestForSubject("cm-02"))?.status, "approved");
    assert.equal(await repo.activeForSubject("cm-03"), null);
  });

  it("updates under a lock and rolls back when the transition is refused", async () => {
    const repo = createPostgresPlansRepository(pool);
    await repo.add(plan("pl-2", "ev-2", { subjectId: "cm-03" }));
    const refused = await repo.update("pl-2", () => err("no"));
    assert.equal(refused.ok, false);
    assert.equal((await repo.get("pl-2"))?.status, "draft");
    const missing = await repo.update("zzz", (p) => ok(p));
    assert.equal(missing.ok, false);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => repo.update("pl-2", (p) => submitForReview(p, "2026-11-16T12:00:00.000Z"))),
    );
    assert.equal(results.filter((r) => r.ok).length, 1);
    assert.equal((await repo.get("pl-2"))?.status, "in_review");
  });

  it("lists by status", async () => {
    const repo = createPostgresPlansRepository(pool);
    assert.deepEqual((await repo.list({ statuses: ["in_review"] })).map((p) => p.id), ["pl-2"]);
    assert.equal((await repo.list()).length, 2);
  });
});
