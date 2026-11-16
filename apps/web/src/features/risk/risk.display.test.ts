import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describeSource } from "./risk.display.ts";

describe("describeSource", () => {
  it("shows no badge for the mock and keeps provider and mode in the detail", () => {
    const meta = describeSource({ provider: "simulated-jev", mode: "mock", calibrated: false });
    assert.equal(meta.badge, null);
    assert.equal(meta.detail, "simulated-jev · mock");
  });

  it("flags Laya as an uncalibrated local fallback", () => {
    const meta = describeSource({ provider: "laya", mode: "live", calibrated: false });
    assert.equal(meta.badge, "local fallback · uncalibrated");
    assert.equal(meta.detail, "laya · live");
  });

  it("shows Jev live without caveat labels", () => {
    const meta = describeSource({ provider: "jev", mode: "live", calibrated: true });
    assert.equal(meta.badge, null);
    assert.equal(meta.detail, "jev · live");
  });
});
