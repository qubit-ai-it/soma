import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { createJsonStore } from "../../server/json-store.ts";
import { createJsonAuditRepository } from "../alerts/alerts.repository.json.ts";
import { earthStateSchema } from "./earth.schema.ts";
import { createJsonEarthRepository } from "./earth.repository.json.ts";
import { createEarthService } from "./earth.service.ts";
import { readFile } from "node:fs/promises";

const CWD = process.cwd();

describe("earth service", () => {
  let root: string;
  let n = 0;
  let tick = 0;

  before(async () => {
    root = await mkdtemp(path.join(tmpdir(), "soma-earth-"));
  });
  after(() => rm(root, { recursive: true, force: true }));

  function setup() {
    const runtimeDir = path.join(root, `r${n++}`);
    const earthStore = createJsonStore({
      seedDir: path.join(CWD, "src", "features", "earth", "seed"),
      runtimeDir,
    });
    const auditStore = createJsonStore({ seedDir: path.join(CWD, "data", "seed"), runtimeDir });
    const audit = createJsonAuditRepository(auditStore);
    let id = 0;
    const service = createEarthService({
      repo: createJsonEarthRepository(earthStore),
      audit,
      now: () => new Date(Date.parse("2026-10-31T06:00:00.000Z") + tick++ * 1000).toISOString(),
      makeId: () => `id-${++id}`,
    });
    return { service, audit };
  }

  it("ships a valid seed with 2 to 3 proposals", async () => {
    const raw = await readFile(path.join(CWD, "src", "features", "earth", "seed", "earth.json"), "utf-8");
    const state = earthStateSchema.parse(JSON.parse(raw));
    assert.ok(state.proposals.length >= 2 && state.proposals.length <= 3);
    assert.ok(state.proposals.every((p) => p.source.version && p.source.provider));
  });

  it("holds a response while the link is down and delivers it once the link is up", async () => {
    const { service, audit } = setup();
    const auditBefore = (await audit.list()).length;
    await service.setLink({ status: "disconnected" });
    const reviewed = await service.review(
      { proposalId: "pp-001", decision: "modify", steps: ["Sleep 8 h"], note: "More rest" },
      "demo-earth-md-01",
    );
    assert.ok(reviewed.ok);

    assert.deepEqual(await service.flush({ force: true }), []);
    let state = await service.getState();
    assert.equal(state.queue[0]?.status, "queued");
    assert.equal(state.queue[0]?.lastError, "link_down");
    assert.equal((await audit.list()).length, auditBefore);

    await service.setLink({ status: "connected" });
    const delivered = await service.flush({ force: true });
    assert.equal(delivered.length, 1);
    state = await service.getState();
    assert.equal(state.queue[0]?.status, "acked");

    const entries = (await audit.list()).slice(auditBefore);
    assert.equal(entries.length, 1);
    const entry = entries[0]!;
    assert.equal(entry.action, "plan_review");
    assert.equal(entry.actor.id, "demo-earth-md-01");
    assert.equal(entry.aiProposal?.provider, "simulated-medgemma");
    assert.equal(entry.aiProposal?.version, "sim-2026.10");
    assert.equal(entry.aiProposal?.steps.length, 3);
    assert.deepEqual(entry.humanDecision, {
      decision: "modify",
      note: "More rest",
      steps: ["Sleep 8 h"],
    });
  });

  it("produces a single audit effect even when the acknowledgement is lost and the packet is redelivered", async () => {
    const { service, audit } = setup();
    const auditBefore = (await audit.list()).length;
    await service.setLink({ ackLoss: true });
    await service.review({ proposalId: "pp-002", decision: "approve", note: "" }, "demo-earth-md-01");
    await service.flush({ force: true });
    await service.flush({ force: true });
    await service.flush({ force: true });
    assert.equal((await service.getState()).queue[0]?.status, "queued");
    assert.equal((await service.getState()).inbox.length, 1);

    await service.setLink({ ackLoss: false });
    await service.flush({ force: true });
    assert.equal((await service.getState()).queue[0]?.status, "acked");
    assert.equal((await audit.list()).length - auditBefore, 1);
  });

  it("refuses a second review of the same proposal", async () => {
    const { service } = setup();
    const first = await service.review({ proposalId: "pp-003", decision: "reject", note: "Not applicable" }, "demo-earth-md-01");
    assert.ok(first.ok);
    const second = await service.review({ proposalId: "pp-003", decision: "approve", note: "" }, "demo-earth-md-01");
    assert.equal(second.ok, false);
    assert.equal((await service.getState()).queue.length, 1);
  });

  it("queues an event once per idempotency key and delivers alert notifications to Earth with an audit entry", async () => {
    const { service, audit } = setup();
    const auditBefore = (await audit.list()).length;
    const input = {
      idempotencyKey: "alert-notify:al-9",
      kind: "alert_notification" as const,
      direction: "to_earth" as const,
      payload: { alertId: "al-9", status: "F3", action: "Immediate evaluation", subjectRef: "cm-03", issuedAt: "2026-10-31T06:00:00.000Z" },
    };
    const results = await Promise.all([service.enqueue(input), service.enqueue(input)]);
    assert.equal(results.filter((r) => r.duplicate).length, 1);
    assert.equal((await service.getState()).queue.length, 1);

    await service.flush({ force: true });
    const entries = (await audit.list()).slice(auditBefore);
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.action, "alert_escalated");
    assert.equal(entries[0]?.alertId, "al-9");
  });

  it("keeps packets in order when several are queued before the link returns", async () => {
    const { service } = setup();
    await service.setLink({ status: "disconnected" });
    for (const key of ["a", "b", "c"]) {
      await service.enqueue({ idempotencyKey: key, kind: "event", direction: "to_earth", payload: { key } });
    }
    await service.flush({ force: true });
    await service.setLink({ status: "connected" });
    const delivered = await service.flush({ force: true });
    assert.deepEqual(
      delivered.map((d) => d.packet.idempotencyKey),
      ["a", "b", "c"],
    );
  });
});
