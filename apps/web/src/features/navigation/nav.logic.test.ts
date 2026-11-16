import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { routeExists } from "../../shared/app-routes.testing.ts";
import { ROLES } from "../roles/roles.types.ts";
import { NAV_ITEMS, activeItemId, navItemsFor } from "./nav.logic.ts";

describe("navItemsFor", () => {
  const idsFor = (role: (typeof ROLES)[number]) => navItemsFor(role, "cm-02").map((i) => i.id);

  it("shows only the sections each role can use", () => {
    assert.deepEqual(idsFor("astronaut"), ["home", "report", "devices", "sentry", "alerts"]);
    assert.deepEqual(idsFor("cmo"), ["home", "report", "alerts", "devices", "sentry"]);
    assert.deepEqual(idsFor("commander"), ["home", "alerts", "sentry"]);
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

  it("puts the most relevant section right after the home", () => {
    const second = (role: (typeof ROLES)[number]) => navItemsFor(role, "cm-02")[1].id;
    assert.equal(second("astronaut"), "report");
    assert.equal(second("cmo"), "report");
    assert.equal(second("commander"), "alerts");
    assert.equal(second("earth"), "earth");
    for (const role of ROLES) assert.equal(navItemsFor(role, "cm-02")[0].id, "home");
  });

  it("opens the astronaut's own report and the first report for the medical officer", () => {
    const report = (role: (typeof ROLES)[number]) =>
      navItemsFor(role, "cm-02").find((i) => i.id === "report")?.href;
    assert.equal(report("astronaut"), "/report/cm-02");
    assert.equal(report("cmo"), "/report/cm-01");
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
