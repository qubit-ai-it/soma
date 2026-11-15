export const PLAN_DISCLAIMER = "Borrador · pendiente de validación en Tierra";
export const APPROVED_CHIP = "Aprobado antes de la misión";
export const IMMEDIATE_STEPS_TITLE = "Pasos pre-aprobados";
export const PROPOSED_DRAFT_TITLE = "Borrador del plan";

export function describeValidation(validation: { status: "pending-validation" }): string {
  const labels = { "pending-validation": "Pendiente de validación en Tierra" };
  return labels[validation.status];
}
