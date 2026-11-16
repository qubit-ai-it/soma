import { memberKey } from "../notifications/notifications.logic.ts";
import type { NewNotification } from "../notifications/notifications.types.ts";
import { locationNames } from "./deck.ts";
import type { ChatEntry } from "./simulation.ts";

const MAX_BODY = 280;

export function instructionNotifications(messages: readonly ChatEntry[], analyst: string): NewNotification[] {
  return messages.map((entry) => ({
    dedupeKey: `simulation:${entry.id}`,
    kind: "task",
    priority: "high",
    title: "Simulation: action needed",
    body: entry.message.length > MAX_BODY ? `${entry.message.slice(0, MAX_BODY - 1)}…` : entry.message,
    memberId: entry.crewId,
    audience: [memberKey(entry.crewId)],
    payload: {
      source: analyst,
      destination: entry.destination ? (locationNames[entry.destination] ?? entry.destination) : null,
    },
  }));
}
