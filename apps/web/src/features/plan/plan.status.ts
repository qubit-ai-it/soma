import type { PlanStatus } from "./plan.record.ts";

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  changes_requested: "Changes requested",
};

export const PLAN_STATUS_TONE: Record<PlanStatus, "ok" | "warn" | "info"> = {
  draft: "info",
  in_review: "info",
  approved: "ok",
  changes_requested: "warn",
};

export const DECISION_LABEL = {
  approve: "Approved",
  comment: "Commented",
  changes: "Requested changes",
} as const;

export const MODE_LABEL = { live: "live", cache: "cache", mock: "simulated" } as const;

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
          ? "With no link, the onboard physician decides."
          : status === "in_review"
            ? "Waiting for Earth."
            : null,
  };
}
