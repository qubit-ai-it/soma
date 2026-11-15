import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { createJsonStore } from "../../server/json-store.ts";
import { acknowledgeAlert, closeAlert } from "./alerts.logic.ts";
import {
  createJsonAlertsRepository,
  createJsonAuditRepository,
} from "./alerts.repository.json.ts";
import type { NewAuditEntry } from "./alerts.types.ts";
import { verifyChain } from "./audit.logic.ts";

const SEED_DIR = path.join(process.cwd(), "data", "seed");
const T0 = "2026-10-31T06:00:00.000Z";

describe("json audit and alerts repositories", () => {
  let root: string;
  let n = 0;

  before(async () => {
    root = await mkdtemp(path.join(tmpdir(), "soma-alerts-"));
  });
  after(() => rm(root, { recursive: true, force: true }));

  function fresh() {
    const store = createJsonStore({ seedDir: SEED_DIR, runtimeDir: path.join(root, `r${n++}`) });
    return {
      store,
      audit: createJsonAuditRepository(store),
      alerts: createJsonAlertsRepository(store),
    };
  }

  const entry = (i: number, extra: Partial<NewAuditEntry> = {}): NewAuditEntry => ({
    action: "alert_raised",
    actor: { kind: "system", id: "deterministic-engine" },
    alertId: `al-x${i}`,
    ...extra,
  });

  it("loads valid seeds with an intact audit chain", async () => {
    const { audit, alerts } = fresh();
    const entries = await audit.list();
    assert.ok(entries.length >= 5);
    assert.deepEqual(verifyChain(entries), { valid: true });
    const list = await alerts.list();
    assert.deepEqual(new Set(list.map((a) => a.status)), new Set(["open", "acknowledged", "closed"]));
    assert.ok(entries.some((e) => e.aiProposal && e.humanDecision));
  });

  it("keeps a consistent chain under concurrent appends", async () => {
    const { audit } = fresh();
    const before = (await audit.list()).length;
    await Promise.all(Array.from({ length: 30 }, (_, i) => audit.append(entry(i))));
    const entries = await audit.list();
    assert.equal(entries.length, before + 30);
    assert.deepEqual(
      entries.map((e) => e.seq),
      Array.from({ length: entries.length }, (_, i) => i + 1),
    );
    assert.equal(new Set(entries.map((e) => e.id)).size, entries.length);
    assert.deepEqual(verifyChain(entries), { valid: true });
  });

  it("records one entry when the same key is appended concurrently", async () => {
    const { audit } = fresh();
    const before = (await audit.list()).length;
    const results = await Promise.all(
      Array.from({ length: 10 }, () => audit.append(entry(0, { idempotencyKey: "same" }))),
    );
    assert.equal(results.filter((r) => !r.duplicate).length, 1);
    assert.equal((await audit.list()).length, before + 1);
  });

  it("does not rewrite earlier entries when appending", async () => {
    const { audit } = fresh();
    const before = await audit.list();
    await audit.append(entry(1));
    const after = await audit.list();
    assert.deepEqual(after.slice(0, before.length), before);
  });

  it("lets only one of two simultaneous acknowledgements win", async () => {
    const { alerts } = fresh();
    const attempt = (actorId: string) =>
      alerts.transition("al-001", (a) => acknowledgeAlert(a, { actorId, role: "cmo", now: T0 }));
    const results = await Promise.all([attempt("demo-cmo-01"), attempt("dr-other-02")]);
    assert.equal(results.filter((r) => r.ok).length, 1);
    const stored = await alerts.get("al-001");
    assert.equal(stored?.status, "acknowledged");
  });

  it("persists a close and refuses to close an unacknowledged alert", async () => {
    const { alerts } = fresh();
    const early = await alerts.transition("al-001", (a) =>
      closeAlert(a, { actorId: "demo-cmo-01", role: "cmo", note: "listo", now: T0 }),
    );
    assert.equal(early.ok, false);
    assert.equal((await alerts.get("al-001"))?.status, "open");

    const closed = await alerts.transition("al-002", (a) =>
      closeAlert(a, { actorId: "demo-commander-01", role: "commander", note: "Resuelto", now: T0 }),
    );
    assert.ok(closed.ok);
    assert.equal((await alerts.get("al-002"))?.closed?.actorId, "demo-commander-01");
  });

  it("reports a missing alert and never creates one on transition", async () => {
    const { alerts } = fresh();
    const result = await alerts.transition("nope", (a) => acknowledgeAlert(a, { actorId: "demo-cmo-01", role: "cmo", now: T0 }));
    assert.equal(result.ok, false);
    assert.equal(await alerts.get("nope"), null);
  });

  it("adds an alert once per id", async () => {
    const { alerts } = fresh();
    const base = (await alerts.list())[0]!;
    const copy = { ...base, id: "al-new" };
    const results = await Promise.all([alerts.add(copy), alerts.add(copy)]);
    assert.equal(results.filter((r) => !r.duplicate).length, 1);
    assert.equal((await alerts.list()).filter((a) => a.id === "al-new").length, 1);
  });

  it("seeds copy independently per runtime directory", async () => {
    const a = fresh();
    const b = fresh();
    await a.audit.append(entry(99));
    assert.equal((await b.audit.list()).length + 1, (await a.audit.list()).length);
  });
});
