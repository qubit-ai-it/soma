import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describePlanSource, PLAN_DISCLAIMER } from "./plan.display.ts";

describe("plan source labels", () => {
  it("labels the random simulation as simulated", () => {
    const source = describePlanSource({ provider: "simulated-medgemma", mode: "mock" });
    assert.equal(source.badge, "Simulado");
    assert.equal(source.detail, "simulated-medgemma · mock");
  });

  it("labels the fixture fallback as a local fallback, not as simulated", () => {
    const source = describePlanSource({ provider: "fixture", mode: "mock" });
    assert.equal(source.badge, "Plan de respaldo · fixture");
    assert.equal(source.detail, "fixture · mock");
  });

  it("shows no badge for the real model but keeps the origin", () => {
    const source = describePlanSource({ provider: "ollama", mode: "live" });
    assert.equal(source.badge, null);
    assert.equal(source.detail, "ollama · live");
  });

  it("keeps the mandatory disclaimer text", () => {
    assert.equal(PLAN_DISCLAIMER, "Borrador · requiere validación humana");
  });
});
