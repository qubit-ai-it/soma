import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";

import { hasDatabase, testPool } from "../../server/postgres.testing.ts";
import { audienceForLevel } from "./notifications.logic.ts";
import { createPostgresNotificationsRepository } from "./notifications.repository.postgres.ts";

describe("postgres notifications repository", { skip: !hasDatabase }, () => {
  const pool = testPool();
  const repo = createPostgresNotificationsRepository(pool);
  const tag = randomUUID();
  const created: string[] = [];

  after(async () => {
    await pool.query("delete from notifications where id = any($1)", [created]);
    await pool.end();
  });

  it("is idempotent by dedupe key", async () => {
    const input = {
      dedupeKey: `test:${tag}:a`,
      kind: "alert" as const,
      priority: "high" as const,
      title: "Prueba",
      memberId: "cm-02",
      audience: audienceForLevel("F2", "cm-02"),
    };
    const first = await repo.add(input);
    created.push(first.notification.id);
    const second = await repo.add(input);
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(second.notification.id, first.notification.id);
  });

  it("returns the latest notification of a kind", async () => {
    const first = await repo.add({
      dedupeKey: `test:${tag}:link1`,
      kind: "link",
      priority: "high",
      title: "Perdido",
      audience: ["role:cmo"],
      payload: { status: "disconnected" },
    });
    const second = await repo.add({
      dedupeKey: `test:${tag}:link2`,
      kind: "link",
      priority: "normal",
      title: "Restablecido",
      audience: ["role:cmo"],
      payload: { status: "connected" },
    });
    created.push(first.notification.id, second.notification.id);
    const latest = await repo.latestOfKind("link");
    assert.equal(latest?.id, second.notification.id);
    assert.equal(latest?.payload.status, "connected");
  });

  it("lists per recipient and tracks reads per recipient", async () => {
    const { notification } = await repo.add({
      dedupeKey: `test:${tag}:b`,
      kind: "alert",
      priority: "critical",
      title: "F3",
      audience: audienceForLevel("F3", "cm-02"),
    });
    created.push(notification.id);
    const cmo = { role: "cmo" as const };
    const other = { role: "astronaut" as const, memberId: "cm-09" };
    const hidden = await repo.add({
      dedupeKey: `test:${tag}:c`,
      kind: "alert",
      priority: "high",
      title: "Solo CMO",
      audience: audienceForLevel("NOT_EVALUABLE", "cm-02"),
    });
    created.push(hidden.notification.id);

    const forOther = await repo.listFor(other, { limit: 200 });
    assert.ok(forOther.some((n) => n.id === notification.id));
    assert.ok(!forOther.some((n) => n.id === hidden.notification.id));

    assert.equal(await repo.markRead(notification.id, cmo), true);
    const cmoList = await repo.listFor(cmo, { limit: 200 });
    assert.equal(cmoList.find((n) => n.id === notification.id)?.read, true);
    const otherList = await repo.listFor(other, { limit: 200 });
    assert.equal(otherList.find((n) => n.id === notification.id)?.read, false);
    assert.equal(await repo.markRead(hidden.notification.id, other), false);
  });
});
