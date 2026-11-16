import type { FollowUpStatus, NotEvaluableReason } from "./followup.types.ts";

export const CONFIRMATION_BANNER = "Lowering the status needs human confirmation";

export const CONFIRMATION_LINE = "Several improving windows and medical sign-off. Never automatic.";

const STATUS_LABELS: Record<FollowUpStatus, string> = {
  improving: "Improving",
  stable: "Stable",
  worsening: "Worsening",
  "not-evaluable": "Not evaluable",
};

const REASON_LABELS: Record<NotEvaluableReason, string> = {
  "baseline-insufficient": "Baseline lacks enough data.",
  "no-reference-deviation": "There was no initial deviation.",
  "data-quality": "Valid observations are missing.",
  "adherence-missing": "No adherence record.",
  "adherence-low": "Adherence too low.",
  "adherence-changed": "Adherence changed a lot.",
};

export const describeStatus = (status: FollowUpStatus): string => STATUS_LABELS[status];
export const describeReason = (reason: NotEvaluableReason): string => REASON_LABELS[reason];
