import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { logActionLabel, qualityLabel, statusLabel } from "./xr.display.ts";

describe("xr display labels", () => {
  it("labels every step status in Spanish", () => {
    assert.equal(statusLabel("pending"), "Pendiente");
    assert.equal(statusLabel("done"), "Hecho");
    assert.equal(statusLabel("skipped"), "Omitido");
    assert.equal(statusLabel("failed"), "Fallido");
  });

  it("labels every log action", () => {
    for (const action of ["started", "completed", "skipped", "failed", "back", "finished", "aborted"] as const) {
      assert.ok(logActionLabel(action).length > 0);
    }
  });

  it("labels image quality", () => {
    assert.equal(qualityLabel("valid"), "Válida");
    assert.equal(qualityLabel("suspect"), "Dudosa");
    assert.equal(qualityLabel("invalid"), "No válida");
    assert.equal(qualityLabel("missing"), "Sin dato");
  });
});
