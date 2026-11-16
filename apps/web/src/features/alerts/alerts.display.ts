import type { Level } from "../roles/roles.types.ts";
import type { Alert, AuditEntry } from "./alerts.types.ts";

export const ACTION_LABELS: Record<AuditEntry["action"], string> = {
  alert_raised: "Alert raised",
  alert_escalated: "Escalated to Earth",
  alert_acknowledged: "Alert acknowledged",
  alert_closed: "Alert closed",
  plan_review: "AI proposal review",
  plan_drafted: "Plan draft generated",
  plan_submitted: "Plan sent to Earth",
};

export const STATUS_LABELS: Record<Alert["status"], { text: string; icon: string }> = {
  open: { text: "Open", icon: "notifications_active" },
  acknowledged: { text: "Acknowledged", icon: "visibility" },
  closed: { text: "Closed", icon: "check_circle" },
};

export const LEVEL_LABELS: Record<Alert["level"], string> = {
  F2: "F2 · Monitor",
  F3: "F3 · Immediate action",
  NOT_EVALUABLE: "Not evaluable · Human review",
};

const RANK: Record<Level, number> = { NOT_EVALUABLE: 0, F0: 1, F1: 2, F2: 3, F3: 4 };

// Highest level among alerts that are still unresolved, per member
export function openLevels(alerts: readonly Alert[]): { memberId: string; level: Level }[] {
  const byMember = new Map<string, Level>();
  for (const alert of alerts) {
    if (alert.status === "closed") continue;
    const current = byMember.get(alert.memberId);
    if (current === undefined || RANK[alert.level] > RANK[current]) {
      byMember.set(alert.memberId, alert.level);
    }
  }
  return [...byMember].map(([memberId, level]) => ({ memberId, level }));
}

export function formatDateTime(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}
