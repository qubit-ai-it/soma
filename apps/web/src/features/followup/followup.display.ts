import type { FollowUpStatus, NotEvaluableReason } from "./followup.types.ts";

export const CONFIRMATION_BANNER = "Bajar de estado necesita confirmación humana";

export const CONFIRMATION_LINE = "Varias ventanas mejorando y el visto bueno médico. Nunca es automático.";

const STATUS_LABELS: Record<FollowUpStatus, string> = {
  improving: "Mejora",
  stable: "Estable",
  worsening: "Empeora",
  "not-evaluable": "No evaluable",
};

const REASON_LABELS: Record<NotEvaluableReason, string> = {
  "baseline-insufficient": "Baseline sin datos suficientes.",
  "no-reference-deviation": "No había desviación inicial.",
  "data-quality": "Faltan observaciones válidas.",
  "adherence-missing": "Sin registro de adherencia.",
  "adherence-low": "Adherencia demasiado baja.",
  "adherence-changed": "La adherencia cambió mucho.",
};

export const describeStatus = (status: FollowUpStatus): string => STATUS_LABELS[status];
export const describeReason = (reason: NotEvaluableReason): string => REASON_LABELS[reason];
