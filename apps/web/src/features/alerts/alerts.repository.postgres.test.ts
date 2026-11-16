import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import type { Pool } from "pg";

import { err, ok } from "../../shared/result.ts";
import { createTestSchema, hasDirectDatabase } from "../../server/postgres.testing.ts";
import {
  createPostgresAlertsRepository,
  createPostgresAuditRepository,
  seedAlertsAndAudit,
} from "./alerts.repository.postgres.ts";
import type { Alert } from "./alerts.types.ts";
import { verifyChain } from "./audit.logic.ts";

const alert = (id: string): Alert => ({
  id,
  memberId: "cm-02",
  memberLabel: "Tripulante cm-02",
  level: "F2",
  title: "Prueba",
  action: "Revisar",
  recipients: ["astronaut", "cmo"],
  status: "open",
  createdAt: "2026-11-16T10:00:00.000Z",
  source: "deterministic-engine",
});

describe("postgres alerts and audit repositories", { skip: !hasDirectDatabase }, () => {
  let pool: Pool;
  let drop: () => Promise<void>;
  before(async () => {
    ({ pool, drop } = await createTestSchema());
  });
  after(async () => {
    await drop();
  });

  it("adds alerts idempotently and transitions inside a lock", async () => {
    const repo = createPostgresAlertsRepository(pool);
    assert.equal((await repo.add(alert("a1"))).duplicate, false);
    assert.equal((await repo.add(alert("a1"))).duplicate, true);
    const done = await repo.transition("a1", (a) =>
      ok({ ...a, status: "acknowledged" as const, acknowledged: { actorId: "demo-cmo-01", role: "cmo" as const, at: "2026-11-16T10:05:00.000Z" } }),
    );
    assert.ok(done.ok);
    assert.equal((await repo.get("a1"))?.status, "acknowledged");
    const rejected = await repo.transition("a1", () => err("nope"));
    assert.equal(rejected.ok, false);
    assert.equal((await repo.get("a1"))?.status, "acknowledged");
    const missing = await repo.transition("zzz", (a) => ok(a));
    assert.equal(missing.ok, false);
  });

  it("keeps the audit chain valid under concurrent appends", async () => {
    const audit = createPostgresAuditRepository(pool);
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        audit.append({
          action: "alert_raised",
          actor: { kind: "system", id: "sentry" },
          alertId: `a${i}`,
          idempotencyKey: `raised:a${i}`,
        }),
      ),
    );
    const entries = await audit.list();
    assert.equal(entries.length, 20);
    assert.deepEqual(entries.map((e) => e.seq), Array.from({ length: 20 }, (_, i) => i + 1));
    assert.ok(verifyChain(entries).valid);
  });

  it("returns the existing entry for a repeated idempotency key", async () => {
    const audit = createPostgresAuditRepository(pool);
    const input = {
      action: "alert_acknowledged" as const,
      actor: { kind: "human" as const, id: "demo-cmo-01", role: "cmo" as const },
      alertId: "a1",
      idempotencyKey: "ack:a1",
    };
    const first = await audit.append(input);
    const second = await audit.append(input);
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(second.entry.id, first.entry.id);
  });

  it("seeds only an empty database and preserves seeded hashes", async () => {
    const { pool: fresh, drop: dropFresh } = await createTestSchema();
    try {
      const source = createPostgresAuditRepository(pool);
      const entries = await source.list();
      const alerts = [alert("s1")];
      await seedAlertsAndAudit(fresh, { alerts, entries });
      await seedAlertsAndAudit(fresh, { alerts: [alert("s2")], entries: [] });
      const seededAudit = await createPostgresAuditRepository(fresh).list();
      assert.deepEqual(seededAudit, entries);
      assert.ok(verifyChain(seededAudit).valid);
      const seededAlerts = await createPostgresAlertsRepository(fresh).list();
      assert.deepEqual(seededAlerts.map((a) => a.id), ["s1"]);
    } finally {
      await dropFresh();
    }
  });
});
