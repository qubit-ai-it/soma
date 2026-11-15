export const PLAN_DISCLAIMER = "Borrador · requiere validación humana";
export const IMMEDIATE_STEPS_TITLE = "Pasos pre-aprobados";
export const PROPOSED_DRAFT_TITLE = "Borrador pendiente de validación en Tierra";

export function describeValidation(validation: { status: "pending-validation" }): string {
  const labels = { "pending-validation": "Pendiente de validación por un médico en Tierra" };
  return labels[validation.status];
}

export function describePlanSource(source: { provider: string; mode: string }): {
  badge: string | null;
  detail: string;
} {
  const detail = `${source.provider} · ${source.mode}`;
  if (source.provider === "fixture") return { badge: "Plan de respaldo · fixture", detail };
  if (source.mode === "mock") return { badge: "Simulado", detail };
  return { badge: null, detail };
}
