import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { routeExists } from "../../shared/app-routes.testing.ts";
import { NAV_ITEMS, activeItemId } from "./nav.logic.ts";

describe("navigation items", () => {
  it("has unique ids and short labels", () => {
    assert.equal(new Set(NAV_ITEMS.map((i) => i.id)).size, NAV_ITEMS.length);
    assert.ok(NAV_ITEMS.every((i) => i.label.length > 0 && i.label.length <= 12));
  });

  it("points every item to a page that exists", () => {
    for (const item of NAV_ITEMS) {
      assert.ok(routeExists(item.href), `no page for ${item.href}`);
    }
  });
});

describe("activeItemId", () => {
  it("marks the home only on the exact root path", () => {
    assert.equal(activeItemId("/"), "home");
    assert.notEqual(activeItemId("/xr"), "home");
  });

  it("marks the report for any member and tab", () => {
    for (const path of [
      "/reporte/cm-01",
      "/reporte/cm-02/evaluacion",
      "/reporte/cm-01/plan",
      "/reporte/cm-01/seguimiento",
    ]) {
      assert.equal(activeItemId(path), "report");
    }
  });

  it("marks the matching section", () => {
    assert.equal(activeItemId("/vivo"), "live");
    assert.equal(activeItemId("/xr"), "xr");
    assert.equal(activeItemId("/tierra"), "earth");
    assert.equal(activeItemId("/alertas"), "alerts");
    assert.equal(activeItemId("/alertas/export"), "alerts");
    assert.equal(activeItemId("/pet"), "sentry");
    assert.equal(activeItemId("/demo"), "demo");
  });

  it("returns null for an unknown path", () => {
    assert.equal(activeItemId("/nope"), null);
  });
});
