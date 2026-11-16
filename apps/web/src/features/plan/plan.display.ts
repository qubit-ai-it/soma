export const PLAN_DISCLAIMER = "Draft · pending validation on Earth";
export const APPROVED_CHIP = "Approved before the mission";
export const IMMEDIATE_STEPS_TITLE = "Pre-approved steps";
export const PROPOSED_DRAFT_TITLE = "Plan draft";

export function describeValidation(validation: { status: "pending-validation" }): string {
  const labels = { "pending-validation": "Pending validation on Earth" };
  return labels[validation.status];
}
