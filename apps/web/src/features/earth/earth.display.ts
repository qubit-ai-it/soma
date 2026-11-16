import type { Direction, Packet, PacketKind } from "./earth.types.ts";

export const KIND_LABELS: Record<PacketKind, string> = {
  alert_notification: "Alert notification",
  plan_response: "Plan response",
  plan_review_request: "Plan for review",
  plan_review_response: "Plan review",
  followup_report: "Follow-up report",
  followup_feedback: "Follow-up response",
  event: "Event",
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  to_earth: "Station to Earth",
  to_station: "Earth to station",
};

export const STATUS_LABELS: Record<Packet["status"], { text: string; icon: string }> = {
  queued: { text: "Queued", icon: "schedule" },
  acked: { text: "Confirmed", icon: "check_circle" },
  failed: { text: "Failed", icon: "error" },
};

const ERROR_LABELS: Record<string, string> = {
  link_down: "No link",
  ack_lost: "Acknowledgement lost",
};

export function errorLabel(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return ERROR_LABELS[code] ?? code;
}

// UTC on purpose: the same text on server and client
export function formatTime(iso: string): string {
  return `${iso.slice(11, 19)} UTC`;
}

export const DECISION_LABELS = {
  approve: "Approved",
  modify: "Modified",
  reject: "Rejected",
} as const;
