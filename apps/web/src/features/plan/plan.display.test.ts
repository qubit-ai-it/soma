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
    assert.equal(PLAN_DISCLAIMER, "Draft · pending validation on Earth");
  });

  it("names the two sections and the approved chip", () => {
    assert.equal(IMMEDIATE_STEPS_TITLE, "Pre-approved steps");
    assert.equal(PROPOSED_DRAFT_TITLE, "Plan draft");
    assert.equal(APPROVED_CHIP, "Approved before the mission");
  });

  it("describes the pending validation status in words", () => {
    assert.equal(describeValidation({ status: "pending-validation" }), "Pending validation on Earth");
  });
});
