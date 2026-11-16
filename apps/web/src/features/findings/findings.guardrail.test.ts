import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkFindings } from "./findings.guardrail.ts";

function blocked(text: string): string {
  const result = checkFindings(text);
  assert.equal(result.allowed, false, `should block: ${text}`);
  assert.ok(!result.allowed && result.reason.length > 0);
  return result.allowed ? "" : result.reason;
}

describe("checkFindings", () => {
  it("allows a descriptive preliminary finding", () => {
    const text =
      "The image shows a central structure with a regular outline. No automatic measurements were taken.";
    assert.deepEqual(checkFindings(text), { allowed: true });
  });

  it("allows a text that denies being a diagnosis", () => {
    assert.equal(
      checkFindings("These findings are not a diagnosis and require physician review.").allowed,
      true,
    );
    assert.equal(checkFindings("This is not a diagnosis; a physician must review it.").allowed, true);
  });

  it("blocks English diagnostic statements", () => {
    blocked("The patient has a gallstone.");
    blocked("You have appendicitis.");
    blocked("This is diagnosed as a pneumothorax.");
    blocked("The diagnosis is a fracture.");
    blocked("Findings confirm a diagnosis of thrombosis.");
  });

  it("blocks English prescriptions", () => {
    blocked("Take 400 mg of ibuprofen twice a day.");
    blocked("I prescribe antibiotics.");
    blocked("You should take the medication every 8 hours.");
    blocked("Administer the drug immediately.");
  });

  it("is case and accent insensitive", () => {
    blocked("THE PATIENT HAS A HERNIA");
    blocked("the diagnosis is pneumothorax");
  });

  it("returns a reason that names the kind of violation", () => {
    assert.match(blocked("The patient has a hernia."), /diagn/i);
    assert.match(blocked("I prescribe paracetamol."), /prescrip/i);
  });
});
