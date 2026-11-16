import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { logActionLabel, qualityLabel, statusLabel } from "./xr.display.ts";

describe("xr display labels", () => {
  it("labels every step status in English", () => {
    assert.equal(statusLabel("pending"), "Pending");
    assert.equal(statusLabel("done"), "Done");
    assert.equal(statusLabel("skipped"), "Skipped");
    assert.equal(statusLabel("failed"), "Failed");
  });

  it("labels every log action", () => {
    for (const action of ["started", "completed", "skipped", "failed", "back", "finished", "aborted"] as const) {
      assert.ok(logActionLabel(action).length > 0);
    }
  });

  it("labels image quality", () => {
    assert.equal(qualityLabel("valid"), "Valid");
    assert.equal(qualityLabel("suspect"), "Doubtful");
    assert.equal(qualityLabel("invalid"), "Not valid");
    assert.equal(qualityLabel("missing"), "No data");
  });
});
