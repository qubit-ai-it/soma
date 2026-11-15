import type { FollowUpStatus, NotEvaluableReason } from "./followup.types.ts";

export const FOLLOWUP_DISCLAIMER =
  "Datos sintéticos de demostración. Los criterios son reglas de demostración del proyecto; no es un diagnóstico.";

export const CONFIRMATION_BANNER =
  "La mejoría no baja el estado de forma automática: hacen falta varias ventanas consecutivas y la confirmación del oficial médico a bordo o de Tierra.";

const STATUS_LABELS: Record<FollowUpStatus, string> = {
  improving: "Mejorando",
  stable: "Estable",
  worsening: "Empeorando",
  "not-evaluable": "No evaluable",
};

const REASON_LABELS: Record<NotEvaluableReason, string> = {
  "baseline-insufficient": "El baseline congelado no tiene datos suficientes.",
  "no-reference-deviation": "No había desviación inicial de la que recuperarse.",
  "data-quality": "Faltan observaciones válidas en la ventana.",
  "adherence-missing": "No hay registro de adherencia en la ventana.",
  "adherence-low": "La adherencia al plan fue demasiado baja para evaluar el efecto.",
  "adherence-changed": "La adherencia cambió mucho respecto a la ventana anterior.",
};

export const describeStatus = (status: FollowUpStatus): string => STATUS_LABELS[status];
export const describeReason = (reason: NotEvaluableReason): string => REASON_LABELS[reason];
