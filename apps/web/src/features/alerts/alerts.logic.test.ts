import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  acknowledgeAlert,
  alertsVisibleTo,
  buildAlert,
  closeAlert,
  escalationFor,
  isIdentifiedHuman,
  projectAlert,
} from "./alerts.logic.ts";
import type { Alert } from "./alerts.types.ts";

const T0 = "2026-10-31T06:00:00.000Z";

function alert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "al-1",
    memberId: "cm-02",
    memberLabel: "Crew member cm-02 (synthetic)",
    level: "F2",
    title: "Vitals out of range",
    action: "Review by the onboard physician",
    recipients: ["astronaut", "cmo"],
    clinicalDetail: "SpO2 90 %",
    status: "open",
    createdAt: T0,
    source: "deterministic-engine",
    ...overrides,
  };
}

describe("escalationFor", () => {
  it("raises no alert for F0 and F1", () => {
    for (const level of ["F0", "F1"] as const) {
      assert.deepEqual(escalationFor(level), { createsAlert: false, recipients: [], notifiesEarth: false });
    }
  });

  it("sends F2 to the astronaut and the CMO only", () => {
    assert.deepEqual(escalationFor("F2"), {
      createsAlert: true,
      recipients: ["astronaut", "cmo"],
      notifiesEarth: false,
    });
  });

  it("sends F3 to the crew and Earth", () => {
    assert.deepEqual(escalationFor("F3"), {
      createsAlert: true,
      recipients: ["astronaut", "cmo", "commander", "earth"],
      notifiesEarth: true,
    });
  });

  it("sends NOT_EVALUABLE to the CMO for human review", () => {
    assert.deepEqual(escalationFor("NOT_EVALUABLE"), {
      createsAlert: true,
      recipients: ["cmo"],
      notifiesEarth: false,
    });
  });
});

describe("isIdentifiedHuman", () => {
  it("accepts named demo actors", () => {
    assert.equal(isIdentifiedHuman("demo-cmo-01"), true);
    assert.equal(isIdentifiedHuman("dr-ferreyra"), true);
  });

  it("rejects empty, malformed and system-like ids", () => {
    for (const id of ["", "  ", "ab", "System", "system", "soma-auto", "sentry", "ai-agent", "bot-1", "simulated-medgemma", "deterministic-engine", "has space", "x".repeat(70)]) {
      assert.equal(isIdentifiedHuman(id), false, id);
    }
  });
});

describe("buildAlert", () => {
  const base = {
    id: "al-9",
    memberId: "cm-03",
    memberLabel: "Crew member cm-03 (synthetic)",
    title: "t",
    action: "a",
    now: T0,
  };

  it("builds an open alert with the escalation recipients", () => {
    const result = buildAlert({ ...base, level: "F3" });
    assert.ok(result.ok);
    assert.equal(result.value.status, "open");
    assert.deepEqual(result.value.recipients, ["astronaut", "cmo", "commander", "earth"]);
    assert.equal(result.value.source, "deterministic-engine");
  });

  it("refuses levels that do not raise alerts", () => {
    assert.equal(buildAlert({ ...base, level: "F1" }).ok, false);
    assert.equal(buildAlert({ ...base, level: "F0" }).ok, false);
  });

  it("refuses an empty action", () => {
    assert.equal(buildAlert({ ...base, level: "F2", action: " " }).ok, false);
  });
});

describe("acknowledgeAlert", () => {
  const who = { actorId: "demo-cmo-01", role: "cmo" as const, now: T0 };

  it("moves an open alert to acknowledged with the actor", () => {
    const result = acknowledgeAlert(alert(), who);
    assert.ok(result.ok);
    assert.equal(result.value.status, "acknowledged");
    assert.deepEqual(result.value.acknowledged, { actorId: "demo-cmo-01", role: "cmo", at: T0 });
  });

  it("refuses an anonymous or system actor", () => {
    assert.equal(acknowledgeAlert(alert(), { ...who, actorId: "" }).ok, false);
    assert.equal(acknowledgeAlert(alert(), { ...who, actorId: "system" }).ok, false);
  });

  it("refuses a role without permission", () => {
    assert.equal(acknowledgeAlert(alert(), { ...who, role: "astronaut" }).ok, false);
  });

  it("refuses an alert that is not open", () => {
    assert.equal(acknowledgeAlert(alert({ status: "acknowledged" }), who).ok, false);
    assert.equal(acknowledgeAlert(alert({ status: "closed" }), who).ok, false);
  });
});

describe("closeAlert", () => {
  const acknowledged = alert({
    status: "acknowledged",
    acknowledged: { actorId: "demo-cmo-01", role: "cmo", at: T0 },
  });
  const who = { actorId: "demo-commander-01", role: "commander" as const, note: "Resolved", now: T0 };

  it("closes an acknowledged alert and keeps who acknowledged it", () => {
    const result = closeAlert(acknowledged, who);
    assert.ok(result.ok);
    assert.equal(result.value.status, "closed");
    assert.equal(result.value.closed?.actorId, "demo-commander-01");
    assert.equal(result.value.acknowledged?.actorId, "demo-cmo-01");
  });

  it("refuses to close an alert nobody acknowledged", () => {
    assert.equal(closeAlert(alert(), who).ok, false);
  });

  it("refuses an anonymous actor, a missing note or a role without permission", () => {
    assert.equal(closeAlert(acknowledged, { ...who, actorId: "bot-1" }).ok, false);
    assert.equal(closeAlert(acknowledged, { ...who, note: " " }).ok, false);
    assert.equal(closeAlert(acknowledged, { ...who, role: "astronaut" }).ok, false);
  });

  it("refuses to close twice", () => {
    const closed = closeAlert(acknowledged, who);
    assert.ok(closed.ok);
    assert.equal(closeAlert(closed.value, who).ok, false);
  });
});

describe("visibility and projection", () => {
  const f2 = alert();
  const f3 = alert({
    id: "al-3",
    memberId: "cm-03",
    level: "F3",
    recipients: ["astronaut", "cmo", "commander", "earth"],
    clinicalDetail: "SpO2 84 %",
  });
  const nev = alert({ id: "al-4", level: "NOT_EVALUABLE", recipients: ["cmo"] });
  const all = [f2, f3, nev];

  it("shows the astronaut only their own alerts, F3 included", () => {
    const ids = alertsVisibleTo(all, { role: "astronaut", memberId: "cm-02" }).map((a) => a.id);
    assert.deepEqual(ids, ["al-1"]);
    const owner = alertsVisibleTo(all, { role: "astronaut", memberId: "cm-03" }).map((a) => a.id);
    assert.deepEqual(owner, ["al-3"]);
    assert.deepEqual(alertsVisibleTo(all, { role: "astronaut", memberId: "cm-05" }), []);
  });

  it("shows the CMO everything, the commander and Earth only F3", () => {
    assert.equal(alertsVisibleTo(all, { role: "cmo" }).length, 3);
    assert.deepEqual(alertsVisibleTo(all, { role: "commander" }).map((a) => a.id), ["al-3"]);
    assert.deepEqual(alertsVisibleTo(all, { role: "earth" }).map((a) => a.id), ["al-3"]);
  });

  it("strips clinical detail for the commander and Earth, even at F3", () => {
    assert.equal(projectAlert(f3, { role: "commander" }).clinicalDetail, undefined);
    assert.equal(projectAlert(f3, { role: "earth" }).clinicalDetail, undefined);
  });

  it("keeps clinical detail for the CMO and for the astronaut's own alert", () => {
    assert.equal(projectAlert(f3, { role: "cmo" }).clinicalDetail, "SpO2 84 %");
    assert.equal(projectAlert(f2, { role: "astronaut", memberId: "cm-02" }).clinicalDetail, "SpO2 90 %");
    assert.equal(projectAlert(f3, { role: "astronaut", memberId: "cm-02" }).clinicalDetail, undefined);
  });

  it("does not mutate the stored alert", () => {
    projectAlert(f3, { role: "earth" });
    assert.equal(f3.clinicalDetail, "SpO2 84 %");
  });
});
