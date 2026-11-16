import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import type { Pool } from "pg";

import { err, ok } from "../../shared/result.ts";
import { createTestSchema, hasDirectDatabase } from "../../server/postgres.testing.ts";
import { buildFollowUpContract } from "./followup.contract.ts";
import type { FollowUpRecord } from "./followup.record.ts";
import { createPostgresFollowUpsRepository } from "./followup.repository.postgres.ts";

const contract = buildFollowUpContract({
  subjectId: "cm-02",
  planStartedAt: "2026-11-16T12:00:00Z",
  baselineFrozenAt: "2026-11-16T10:00:00Z",
  targets: [{ signal: "heartRate", expectedDirection: "decrease" }],
});

const record = (id: string, planId: string, over: Partial<FollowUpRecord> = {}): FollowUpRecord => ({
  id,
  planId,
  subjectId: "cm-02",
  status: "active",
  contract,
  reports: [],
  createdAt: "2026-11-16T12:00:00.000Z",
  updatedAt: "2026-11-16T12:00:00.000Z",
  ...over,
});

describe("postgres follow-ups repository", { skip: !hasDirectDatabase }, () => {
  let pool: Pool;
  let drop: () => Promise<void>;
  before(async () => {
    ({ pool, drop } = await createTestSchema());
  });
  after(async () => {
    await drop();
  });

  it("adds once per plan and round-trips the contract", async () => {
    const repo = createPostgresFollowUpsRepository(pool);
    const first = await repo.add(record("fu-1", "pl-1"));
    const second = await repo.add(record("fu-other", "pl-1"));
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(second.record.id, "fu-1");
    assert.deepEqual((await repo.getByPlan("pl-1"))?.contract, contract);
    assert.equal(await repo.getByPlan("nope"), null);
  });

  it("lists only active follow-ups and finds the latest of a subject", async () => {
    const repo = createPostgresFollowUpsRepository(pool);
    await repo.add(record("fu-2", "pl-2", { createdAt: "2026-11-16T13:00:00.000Z", updatedAt: "2026-11-16T13:00:00.000Z" }));
    await repo.update("fu-1", (r) => ok({ ...r, status: "closed", updatedAt: "2026-11-16T14:00:00.000Z" }));
    assert.deepEqual((await repo.listActive()).map((r) => r.id), ["fu-2"]);
    assert.equal((await repo.latestForSubject("cm-02"))?.id, "fu-2");
  });

  it("updates reports under a lock and rolls back a refused change", async () => {
    const repo = createPostgresFollowUpsRepository(pool);
    const report = {
      windowId: "w1",
      label: "Ventana 1",
      start: "2026-11-16T12:00:00.000Z",
      end: "2026-11-19T12:00:00.000Z",
      status: "not-evaluable" as const,
      reasons: ["adherence-missing"],
      escalate: false,
      reportedAt: "2026-11-19T12:00:00.000Z",
    };
    assert.equal((await repo.update("fu-2", () => err("no"))).ok, false);
    assert.equal((await repo.update("zzz", (r) => ok(r))).ok, false);
    const done = await repo.update("fu-2", (r) => ok({ ...r, reports: [...r.reports, report], updatedAt: report.reportedAt }));
    assert.ok(done.ok);
    assert.deepEqual((await repo.getByPlan("pl-2"))?.reports, [report]);
  });
});
