import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { createJsonStore } from "../../server/json-store.ts";
import { createJsonEarthRepository } from "../earth/earth.repository.json.ts";
import { createEarthService } from "../earth/earth.service.ts";
import { verifyChain } from "./audit.logic.ts";
import { createJsonAlertsRepository, createJsonAuditRepository } from "./alerts.repository.json.ts";
import { createAlertService } from "./alerts.service.ts";

const CWD = process.cwd();
const base = {
  memberId: "cm-05",
  memberLabel: "Crew member cm-05 (synthetic)",
  title: "t",
  action: "Immediate medical evaluation",
};

describe("alert service", () => {
  let root: string;
  let n = 0;

  before(async () => {
    root = await mkdtemp(path.join(tmpdir(), "soma-alert-svc-"));
  });
  after(() => rm(root, { recursive: true, force: true }));

  function setup() {
    const runtimeDir = path.join(root, `r${n++}`);
    const dataStore = createJsonStore({ seedDir: path.join(CWD, "data", "seed"), runtimeDir });
    const earthStore = createJsonStore({
      seedDir: path.join(CWD, "src", "features", "earth", "seed"),
      runtimeDir,
    });
    const audit = createJsonAuditRepository(dataStore);
    const alerts = createJsonAlertsRepository(dataStore);
    const earth = createEarthService({ repo: createJsonEarthRepository(earthStore), audit });
    const service = createAlertService({ alerts, audit, enqueueToEarth: earth.enqueue });
    return { service, alerts, audit, earth };
  }

  it("raises an F2 alert with an audit entry and no Earth packet", async () => {
    const { service, alerts, audit, earth } = setup();
    const before = (await audit.list()).length;
    const result = await service.raise({ ...base, level: "F2" });
    assert.ok(result.ok);
    assert.equal((await alerts.get(result.value.id))?.status, "open");
    const entries = (await audit.list()).slice(before);
    assert.deepEqual(entries.map((e) => e.action), ["alert_raised"]);
    assert.equal((await earth.getState()).queue.length, 0);
  });

  it("raises an F3 alert and queues a minimum-payload notification for Earth", async () => {
    const { service, earth } = setup();
    const result = await service.raise({ ...base, level: "F3", clinicalDetail: "SpO2 84 %" });
    assert.ok(result.ok);
    const [packet] = (await earth.getState()).queue;
    assert.equal(packet?.kind, "alert_notification");
    assert.equal(packet?.direction, "to_earth");
    assert.deepEqual(Object.keys(packet!.payload).sort(), ["action", "alertId", "issuedAt", "status", "subjectRef"]);
    assert.ok(!JSON.stringify(packet).includes("SpO2"));
  });

  it("does not duplicate the alert, audit entry or packet when raised twice with the same id", async () => {
    const { service, alerts, audit, earth } = setup();
    const before = (await audit.list()).length;
    const input = { ...base, level: "F3" as const, alertId: "al-fixed" };
    await Promise.all([service.raise(input), service.raise(input)]);
    assert.equal((await alerts.list()).filter((a) => a.id === "al-fixed").length, 1);
    assert.equal((await audit.list()).length - before, 1);
    assert.equal((await earth.getState()).queue.length, 1);
  });

  it("refuses levels that raise no alert", async () => {
    const { service, alerts } = setup();
    const count = (await alerts.list()).length;
    assert.equal((await service.raise({ ...base, level: "F1" })).ok, false);
    assert.equal((await alerts.list()).length, count);
  });

  it("acknowledges then closes, writing one audit entry per action", async () => {
    const { service, audit, alerts } = setup();
    const before = (await audit.list()).length;
    const ack = await service.acknowledge({ alertId: "al-001", actorId: "demo-cmo-01", role: "cmo" });
    assert.ok(ack.ok);
    const closed = await service.close({ alertId: "al-001", actorId: "demo-commander-01", role: "commander", note: "Resolved" });
    assert.ok(closed.ok);
    const entries = (await audit.list()).slice(before);
    assert.deepEqual(entries.map((e) => [e.action, e.actor.id]), [
      ["alert_acknowledged", "demo-cmo-01"],
      ["alert_closed", "demo-commander-01"],
    ]);
    assert.equal((await alerts.get("al-001"))?.status, "closed");
    assert.deepEqual(verifyChain(await audit.list()), { valid: true });
  });

  it("rejects anonymous, system and unauthorized actors without touching alert or audit", async () => {
    const { service, audit, alerts } = setup();
    const before = (await audit.list()).length;
    for (const [actorId, role] of [["", "cmo"], ["system", "cmo"], ["demo-astronaut-01", "astronaut"]] as const) {
      const result = await service.acknowledge({ alertId: "al-001", actorId, role });
      assert.equal(result.ok, false, `${actorId}/${role}`);
    }
    assert.equal((await alerts.get("al-001"))?.status, "open");
    assert.equal((await audit.list()).length, before);
  });

  it("does not close by itself: close needs prior acknowledgement and a note", async () => {
    const { service, alerts } = setup();
    assert.equal((await service.close({ alertId: "al-001", actorId: "demo-cmo-01", role: "cmo", note: "ok" })).ok, false);
    await service.acknowledge({ alertId: "al-001", actorId: "demo-cmo-01", role: "cmo" });
    assert.equal((await service.close({ alertId: "al-001", actorId: "demo-cmo-01", role: "cmo", note: " " })).ok, false);
    assert.equal((await alerts.get("al-001"))?.status, "acknowledged");
  });

  it("writes a single audit entry when two people acknowledge at once", async () => {
    const { service, audit } = setup();
    const before = (await audit.list()).length;
    const results = await Promise.all([
      service.acknowledge({ alertId: "al-001", actorId: "demo-cmo-01", role: "cmo" }),
      service.acknowledge({ alertId: "al-001", actorId: "demo-commander-01", role: "commander" }),
    ]);
    assert.equal(results.filter((r) => r.ok).length, 1);
    assert.equal((await audit.list()).length - before, 1);
  });
});
