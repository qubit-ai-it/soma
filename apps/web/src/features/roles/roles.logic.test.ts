import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEMO_ACTORS,
  ROLE_LABELS,
  buildF3Notification,
  buildOperationalSummary,
  canAccess,
  isRole,
} from "./roles.logic.ts";
import { LEVELS, RESOURCES, ROLES } from "./roles.types.ts";

describe("clinical detail", () => {
  it("is visible to the astronaut only for own data, at any level", () => {
    for (const level of LEVELS) {
      assert.equal(canAccess("astronaut", "clinical_detail", { level, ownData: true }), true);
      assert.equal(canAccess("astronaut", "clinical_detail", { level, ownData: false }), false);
      assert.equal(canAccess("astronaut", "clinical_detail", { level }), false);
    }
  });

  it("is visible to the CMO for every crew member and level", () => {
    for (const level of LEVELS) {
      assert.equal(canAccess("cmo", "clinical_detail", { level, ownData: false }), true);
    }
  });

  it("is never visible to the commander or Earth, including F3", () => {
    for (const role of ["commander", "earth"] as const) {
      for (const level of LEVELS) {
        assert.equal(canAccess(role, "clinical_detail", { level, ownData: true }), false);
        assert.equal(canAccess(role, "clinical_detail", { level, ownData: false }), false);
      }
    }
  });

  it("denies when the level is missing for a non-CMO role", () => {
    assert.equal(canAccess("commander", "clinical_detail"), false);
    assert.equal(canAccess("earth", "clinical_detail"), false);
  });
});

describe("other resources", () => {
  const expected: Record<string, Record<string, boolean>> = {
    operational_summary: { astronaut: false, cmo: true, commander: true, earth: false },
    f3_notification: { astronaut: true, cmo: true, commander: true, earth: true },
    alert_list: { astronaut: true, cmo: true, commander: true, earth: true },
    alert_acknowledge: { astronaut: false, cmo: true, commander: true, earth: true },
    alert_close: { astronaut: false, cmo: true, commander: true, earth: true },
    audit_log: { astronaut: false, cmo: true, commander: true, earth: true },
    earth_console: { astronaut: false, cmo: false, commander: false, earth: true },
    plan_review: { astronaut: false, cmo: false, commander: false, earth: true },
  };

  for (const [resource, byRole] of Object.entries(expected)) {
    it(`matrix for ${resource}`, () => {
      for (const role of ROLES) {
        assert.equal(
          canAccess(role, resource as (typeof RESOURCES)[number]),
          byRole[role],
          `${role} / ${resource}`,
        );
      }
    });
  }

  it("covers every resource in the table above", () => {
    const covered = new Set(Object.keys(expected));
    for (const resource of RESOURCES) {
      if (resource !== "clinical_detail") assert.ok(covered.has(resource), resource);
    }
  });
});

describe("F3 notification", () => {
  it("carries only status, action, an opaque subject reference and a timestamp", () => {
    const result = buildF3Notification({
      level: "F3",
      subjectId: "cm-02",
      action: "Evaluación médica inmediata",
      issuedAt: "2026-10-31T06:00:00Z",
    });
    assert.ok(result.ok);
    assert.deepEqual(result.value, {
      status: "F3",
      action: "Evaluación médica inmediata",
      subjectRef: "cm-02",
      issuedAt: "2026-10-31T06:00:00Z",
    });
  });

  it("refuses any level other than F3", () => {
    for (const level of ["F0", "F1", "F2", "NOT_EVALUABLE"] as const) {
      const result = buildF3Notification({
        level,
        subjectId: "cm-02",
        action: "x",
        issuedAt: "2026-10-31T06:00:00Z",
      });
      assert.equal(result.ok, false, level);
    }
  });

  it("refuses an empty action or subject", () => {
    assert.equal(
      buildF3Notification({ level: "F3", subjectId: "cm-02", action: " ", issuedAt: "t" }).ok,
      false,
    );
    assert.equal(
      buildF3Notification({ level: "F3", subjectId: "", action: "x", issuedAt: "t" }).ok,
      false,
    );
  });
});

describe("operational summary", () => {
  it("maps levels to availability without exposing the level", () => {
    const summary = buildOperationalSummary([
      { memberId: "a", level: "F0" },
      { memberId: "b", level: "F1" },
      { memberId: "c", level: "F2" },
      { memberId: "d", level: "F3" },
      { memberId: "e", level: "NOT_EVALUABLE" },
    ]);
    assert.equal(summary.total, 5);
    assert.deepEqual(summary.availability, { available: 2, limited: 1, unavailable: 1, unknown: 1 });
    assert.deepEqual(summary.members, [
      { memberId: "a", availability: "available" },
      { memberId: "b", availability: "available" },
      { memberId: "c", availability: "limited" },
      { memberId: "d", availability: "unavailable" },
      { memberId: "e", availability: "unknown" },
    ]);
    for (const member of summary.members) {
      assert.deepEqual(Object.keys(member).sort(), ["availability", "memberId"]);
    }
  });

  it("handles an empty crew", () => {
    const summary = buildOperationalSummary([]);
    assert.equal(summary.total, 0);
    assert.deepEqual(summary.members, []);
  });
});

describe("demo actors and role guard", () => {
  it("has one named actor per role and a label per role", () => {
    for (const role of ROLES) {
      assert.ok(DEMO_ACTORS[role].id.length > 2);
      assert.ok(ROLE_LABELS[role].length > 2);
    }
    assert.equal(new Set(ROLES.map((role) => DEMO_ACTORS[role].id)).size, ROLES.length);
  });

  it("recognizes valid roles only", () => {
    assert.equal(isRole("cmo"), true);
    assert.equal(isRole("admin"), false);
    assert.equal(isRole(undefined), false);
  });
});
