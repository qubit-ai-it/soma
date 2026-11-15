import type { Direction, Packet, PacketKind } from "./earth.types.ts";

export const KIND_LABELS: Record<PacketKind, string> = {
  alert_notification: "Notificación de alerta",
  plan_response: "Respuesta de plan",
  event: "Evento",
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  to_earth: "Estación a Tierra",
  to_station: "Tierra a estación",
};

export const STATUS_LABELS: Record<Packet["status"], { text: string; icon: string }> = {
  queued: { text: "En cola", icon: "schedule" },
  acked: { text: "Confirmado", icon: "check_circle" },
  failed: { text: "Fallido", icon: "error" },
};

const ERROR_LABELS: Record<string, string> = {
  link_down: "Sin enlace",
  ack_lost: "Confirmación perdida",
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
  approve: "Aprobada",
  modify: "Modificada",
  reject: "Rechazada",
} as const;
