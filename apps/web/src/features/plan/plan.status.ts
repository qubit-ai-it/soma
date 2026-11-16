import type { PlanStatus } from "./plan.record.ts";

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  approved: "Aprobado",
  changes_requested: "Cambios pedidos",
};

export const PLAN_STATUS_TONE: Record<PlanStatus, "ok" | "warn" | "info"> = {
  draft: "info",
  in_review: "info",
  approved: "ok",
  changes_requested: "warn",
};

export const DECISION_LABEL = {
  approve: "Aprobó",
  comment: "Comentó",
  changes: "Pidió cambios",
} as const;

export const MODE_LABEL = { live: "en vivo", cache: "caché", mock: "simulado" } as const;

export function boardActions(
  status: PlanStatus,
  link: "connected" | "disconnected",
): { submit: boolean; approve: boolean; note: string | null } {
  const open = status !== "approved";
  return {
    submit: status === "draft" || status === "changes_requested",
    approve: open && link === "disconnected",
    note:
      status === "approved"
        ? null
        : link === "disconnected"
          ? "Sin enlace decide el médico de a bordo."
          : status === "in_review"
            ? "Esperando a Tierra."
            : null,
  };
}
