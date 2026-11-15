import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { trayItems, unreadCount } from "./alerts.tray.ts";
import type { Alert } from "./alerts.types.ts";

function alert(overrides: Partial<Alert> & Pick<Alert, "id" | "level">): Alert {
  return {
    memberId: "cm-01",
    memberLabel: "Tripulante cm-01",
    title: `Alerta ${overrides.id}`,
    action: "Seguir el protocolo.",
    recipients: ["astronaut", "cmo", "commander", "earth"],
    status: "open",
    createdAt: "2026-11-20T10:00:00Z",
    source: "deterministic-engine",
    ...overrides,
  };
}

const alerts: Alert[] = [
  alert({ id: "old-f2", level: "F2", recipients: ["astronaut", "cmo"], createdAt: "2026-11-20T09:00:00Z" }),
  alert({ id: "new-f2", level: "F2", recipients: ["astronaut", "cmo"], createdAt: "2026-11-20T11:00:00Z" }),
  alert({ id: "f3", level: "F3", createdAt: "2026-11-20T08:00:00Z" }),
  alert({ id: "ne", level: "NOT_EVALUABLE", recipients: ["cmo"], createdAt: "2026-11-20T12:00:00Z" }),
  alert({ id: "closed", level: "F3", status: "closed", createdAt: "2026-11-20T13:00:00Z" }),
  alert({ id: "other-f2", level: "F2", memberId: "cm-09", recipients: ["astronaut", "cmo"] }),
];

const ids = (viewer: Parameters<typeof trayItems>[1]) => trayItems(alerts, viewer).map((i) => i.id);

describe("trayItems", () => {
  it("leaves out closed alerts and orders by severity, then newest first", () => {
    assert.deepEqual(ids({ role: "cmo" }), ["f3", "new-f2", "other-f2", "old-f2", "ne"]);
  });

  it("shows the astronaut only their own F2 alerts and every F3", () => {
    assert.deepEqual(ids({ role: "astronaut", memberId: "cm-01" }), ["f3", "new-f2", "old-f2"]);
  });

  it("shows the commander and Earth only what was addressed to them", () => {
    assert.deepEqual(ids({ role: "commander" }), ["f3"]);
    assert.deepEqual(ids({ role: "earth" }), ["f3"]);
  });

  it("maps the level to a tone and uses the action as the line", () => {
    const [f3, f2] = trayItems(alerts, { role: "cmo" });
    assert.equal(f3.tone, "danger");
    assert.equal(f2.tone, "warn");
    assert.equal(f3.line, "Seguir el protocolo.");
    const ne = trayItems(alerts, { role: "cmo" }).find((i) => i.id === "ne");
    assert.equal(ne?.tone, "info");
  });

  it("never carries clinical detail", () => {
    const withDetail = [alert({ id: "d", level: "F3", clinicalDetail: "secreto" })];
    const [item] = trayItems(withDetail, { role: "cmo" });
    assert.equal("clinicalDetail" in item, false);
  });

  it("does not change the list it receives", () => {
    const snapshot = JSON.stringify(alerts);
    trayItems(alerts, { role: "cmo" });
    assert.equal(JSON.stringify(alerts), snapshot);
  });
});

describe("unreadCount", () => {
  it("counts only alerts that are still open", () => {
    const withAck = [...alerts, alert({ id: "ack", level: "F2", status: "acknowledged" })];
    assert.equal(unreadCount(trayItems(withAck, { role: "cmo" })), 5);
  });

  it("is zero for an empty tray", () => {
    assert.equal(unreadCount([]), 0);
  });
});
