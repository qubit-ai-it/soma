import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { routeExists } from "../../shared/app-routes.testing.ts";
import { ROLES } from "../roles/roles.types.ts";
import { NAV_ITEMS, activeItemId, navItemsFor } from "./nav.logic.ts";

describe("navItemsFor", () => {
  const idsFor = (role: (typeof ROLES)[number]) => navItemsFor(role, "cm-02").map((i) => i.id);

  it("shows only the sections each role can use", () => {
    assert.deepEqual(idsFor("astronaut"), ["sentry", "home", "report", "devices", "alerts"]);
    assert.deepEqual(idsFor("cmo"), ["sentry", "home", "report", "alerts", "devices"]);
    assert.deepEqual(idsFor("commander"), ["sentry", "home", "alerts"]);
    assert.deepEqual(idsFor("earth"), ["home", "earth", "alerts"]);
  });

  it("hides the clinical and device sections from the commander and Earth", () => {
    for (const hidden of ["report", "devices"]) {
      assert.equal(idsFor("commander").includes(hidden), false, `commander: ${hidden}`);
      assert.equal(idsFor("earth").includes(hidden), false, `earth: ${hidden}`);
    }
  });

  it("shows the Earth console only to Earth", () => {
    for (const role of ROLES) {
      assert.equal(idsFor(role).includes("earth"), role === "earth", role);
    }
  });

  it("always offers the home and the alerts tray, and only sections that exist", () => {
    const known = new Set(NAV_ITEMS.map((i) => i.id));
    for (const role of ROLES) {
      assert.ok(idsFor(role).includes("home") && idsFor(role).includes("alerts"), role);
      assert.ok(idsFor(role).every((id) => known.has(id)), role);
    }
  });

  it("puts Sentry first for the crew and the home first for Earth", () => {
    for (const role of ["astronaut", "cmo", "commander"] as const) {
      assert.equal(navItemsFor(role, "cm-02")[0].id, "sentry", role);
      assert.equal(navItemsFor(role, "cm-02")[1].id, "home", role);
    }
    assert.equal(navItemsFor("earth", "cm-02")[0].id, "home");
  });

  it("puts the most relevant section right after the home", () => {
    const after = (role: (typeof ROLES)[number]) => {
      const items = navItemsFor(role, "cm-02");
      return items[items.findIndex((i) => i.id === "home") + 1].id;
    };
    assert.equal(after("astronaut"), "report");
    assert.equal(after("cmo"), "report");
    assert.equal(after("commander"), "alerts");
    assert.equal(after("earth"), "earth");
  });

  it("opens the astronaut's own report and the crew overview for the medical officer", () => {
    const report = (role: (typeof ROLES)[number], memberId: string | null = "cm-02") =>
      navItemsFor(role, memberId).find((i) => i.id === "report")?.href;
    assert.equal(report("astronaut"), "/report/cm-02");
    assert.equal(report("astronaut", null), "/mission");
    assert.equal(report("cmo"), "/mission");
    assert.equal(report("commander"), undefined);
    assert.equal(report("earth"), undefined);
  });

  it("points every item of every role to a page that exists", () => {
    for (const role of ROLES) {
      for (const item of navItemsFor(role, "cm-02")) {
        assert.ok(item.href === undefined || routeExists(item.href), `${role}: no page for ${item.href}`);
      }
    }
  });
});

describe("navigation items", () => {
  it("uses English labels without changing routes", () => {
    assert.deepEqual(NAV_ITEMS.map((item) => item.label), ["Home", "Report", "Devices", "Earth", "Alerts", "Sentry"]);
  });
  it("has unique ids and short labels", () => {
    assert.equal(new Set(NAV_ITEMS.map((i) => i.id)).size, NAV_ITEMS.length);
    assert.ok(NAV_ITEMS.every((i) => i.label.length > 0 && i.label.length <= 12));
  });

  it("points every item to a page that exists", () => {
    for (const item of NAV_ITEMS) {
      assert.ok(item.href === undefined || routeExists(item.href), `no page for ${item.href}`);
    }
  });
});

describe("activeItemId", () => {
  it("marks the home only on the exact root path", () => {
    assert.equal(activeItemId("/"), "home");
    assert.notEqual(activeItemId("/devices/experiences"), "home");
  });

  it("marks the report for any member and tab", () => {
    for (const path of [
      "/report/cm-01",
      "/report/cm-02/evaluation",
      "/report/cm-01/plan",
      "/report/cm-01/follow-up",
    ]) {
      assert.equal(activeItemId(path), "report");
    }
  });

  it("marks the matching section", () => {
    assert.equal(activeItemId("/devices"), "devices");
    assert.equal(activeItemId("/devices/experiences"), "devices");
    assert.equal(activeItemId("/earth"), "earth");
    assert.equal(activeItemId("/pet"), "sentry");
  });

  it("no longer has an alerts page", () => {
    assert.equal(activeItemId("/alertas"), null);
  });

  it("returns null for an unknown path", () => {
    assert.equal(activeItemId("/nope"), null);
  });
});
