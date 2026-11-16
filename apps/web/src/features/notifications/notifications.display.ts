import type { Notification } from "./notifications.types.ts";

export type NotificationKind = Notification["kind"];
export type Tone = "ok" | "warn" | "danger" | "info" | "neutral";

export const KIND_LABEL: Record<NotificationKind, string> = {
  alert: "Alert",
  checkin: "Check-in",
  reminder: "Reminder",
  task: "Task",
  summary: "Shift",
  link: "Link",
  space_weather: "Space weather",
  earth_response: "Earth",
  plan: "Plan",
  followup: "Follow-up",
};

export function toneFor(priority: Notification["priority"]): Tone {
  if (priority === "critical") return "danger";
  if (priority === "high") return "warn";
  if (priority === "normal") return "info";
  return "neutral";
}

export function sentryFeed(notifications: readonly Notification[]): {
  primary: Notification[];
  digest: Notification[];
} {
  const feed = notifications.filter((n) => n.kind !== "alert").sort((a, b) => b.seq - a.seq);
  return {
    primary: feed.filter((n) => n.priority !== "low"),
    digest: feed.filter((n) => n.priority === "low"),
  };
}

export function unreadIds(notifications: readonly Notification[]): string[] {
  return notifications.filter((n) => n.kind !== "alert" && !n.read).map((n) => n.id);
}

export function mergeNotifications(
  current: readonly Notification[],
  incoming: readonly Notification[],
): Notification[] {
  const byId = new Map(current.map((n) => [n.id, n]));
  for (const n of incoming) byId.set(n.id, byId.get(n.id)?.read ? { ...n, read: true } : n);
  return [...byId.values()].sort((a, b) => b.seq - a.seq).slice(0, 200);
}

export function timeLabel(iso: string): string {
  return `${iso.slice(11, 16)} UTC`;
}
