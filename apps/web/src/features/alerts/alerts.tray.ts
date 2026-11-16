import type { Role } from "../roles/roles.types.ts";
import { alertsVisibleTo } from "./alerts.logic.ts";
import type { Alert, AlertLevel, AlertStatus } from "./alerts.types.ts";

export type TrayTone = "danger" | "warn" | "info";

export type TrayItem = {
  id: string;
  title: string;
  line: string;
  memberLabel: string;
  level: AlertLevel;
  status: AlertStatus;
  tone: TrayTone;
  createdAt: string;
};

const RANK: Record<AlertLevel, number> = { F3: 3, F2: 2, NOT_EVALUABLE: 1 };
const TONE: Record<AlertLevel, TrayTone> = { F3: "danger", F2: "warn", NOT_EVALUABLE: "info" };

export function trayItems(
  alerts: readonly Alert[],
  viewer: { role: Role; memberId?: string },
): TrayItem[] {
  return alertsVisibleTo(alerts, viewer)
    .filter((alert) => alert.status !== "closed")
    .sort((a, b) => RANK[b.level] - RANK[a.level] || b.createdAt.localeCompare(a.createdAt))
    .map((alert) => ({
      id: alert.id,
      title: alert.title,
      line: alert.action,
      memberLabel: alert.memberLabel,
      level: alert.level,
      status: alert.status,
      tone: TONE[alert.level],
      createdAt: alert.createdAt,
    }));
}

export type TrayFilter = { status: "all" | "open" | "acknowledged"; level: "all" | AlertLevel };

export function filterTray(items: readonly TrayItem[], filter: TrayFilter): TrayItem[] {
  return items.filter(
    (item) =>
      (filter.status === "all" || item.status === filter.status) &&
      (filter.level === "all" || item.level === filter.level),
  );
}

export function unreadCount(items: readonly TrayItem[]): number {
  return items.filter((item) => item.status === "open").length;
}
