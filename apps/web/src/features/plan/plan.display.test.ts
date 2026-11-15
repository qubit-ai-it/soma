import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  APPROVED_CHIP,
  describeValidation,
  IMMEDIATE_STEPS_TITLE,
  PLAN_DISCLAIMER,
  PROPOSED_DRAFT_TITLE,
} from "./plan.display.ts";

describe("plan labels", () => {
  it("keeps the mandatory draft disclaimer text", () => {
    assert.equal(PLAN_DISCLAIMER, "Borrador · pendiente de validación en Tierra");
  });

  it("names the two sections and the approved chip", () => {
    assert.equal(IMMEDIATE_STEPS_TITLE, "Pasos pre-aprobados");
    assert.equal(PROPOSED_DRAFT_TITLE, "Borrador del plan");
    assert.equal(APPROVED_CHIP, "Aprobado antes de la misión");
  });

  it("describes the pending validation status in words", () => {
    assert.equal(describeValidation({ status: "pending-validation" }), "Pendiente de validación en Tierra");
  });
});
