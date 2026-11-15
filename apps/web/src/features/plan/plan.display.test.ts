import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  describePlanSource,
  describeValidation,
  IMMEDIATE_STEPS_TITLE,
  PLAN_DISCLAIMER,
  PROPOSED_DRAFT_TITLE,
} from "./plan.display.ts";

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

describe("plan split labels", () => {
  it("names the two sections", () => {
    assert.equal(IMMEDIATE_STEPS_TITLE, "Pasos pre-aprobados");
    assert.equal(PROPOSED_DRAFT_TITLE, "Borrador pendiente de validación en Tierra");
  });

  it("describes the pending validation status in words", () => {
    assert.equal(
      describeValidation({ status: "pending-validation" }),
      "Pendiente de validación por un médico en Tierra",
    );
  });
});
