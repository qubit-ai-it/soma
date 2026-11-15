import { randomUUID } from "node:crypto";

import type { JsonStore } from "../../server/json-store.ts";
import { err, type Result } from "../../shared/result.ts";
import { alertsFileSchema, auditFileSchema } from "./alerts.schema.ts";
import type { AlertsRepository, AuditRepository } from "./alerts.repository.ts";
import type { Alert, AuditEntry } from "./alerts.types.ts";
import { appendEntry } from "./audit.logic.ts";

export const ALERTS_STORE_NAME = "alerts";
export const AUDIT_STORE_NAME = "audit";

type Clock = { now: () => string; makeId: () => string };
const systemClock: Clock = { now: () => new Date().toISOString(), makeId: () => randomUUID() };

export function createJsonAuditRepository(store: JsonStore, clock: Clock = systemClock): AuditRepository {
  return {
    list: async () => auditFileSchema.parse(await store.read(AUDIT_STORE_NAME)).entries,
    append: async (input) => {
      let outcome!: { entry: AuditEntry; duplicate: boolean };
      await store.update(AUDIT_STORE_NAME, (current) => {
        const { entries } = auditFileSchema.parse(current);
        const result = appendEntry(entries, input, { id: clock.makeId(), at: clock.now() });
        outcome = { entry: result.entry, duplicate: result.duplicate };
        return { entries: result.entries };
      });
      return outcome;
    },
  };
}

export function createJsonAlertsRepository(store: JsonStore): AlertsRepository {
  const load = async () => alertsFileSchema.parse(await store.read(ALERTS_STORE_NAME)).alerts;

  return {
    list: load,
    get: async (id) => (await load()).find((alert) => alert.id === id) ?? null,
    add: async (alert) => {
      let outcome!: { alert: Alert; duplicate: boolean };
      await store.update(ALERTS_STORE_NAME, (current) => {
        const { alerts } = alertsFileSchema.parse(current);
        const existing = alerts.find((a) => a.id === alert.id);
        outcome = { alert: existing ?? alert, duplicate: existing !== undefined };
        return { alerts: existing ? alerts : [...alerts, alert] };
      });
      return outcome;
    },
    transition: async (id, fn) => {
      let outcome: Result<Alert> = err("Alert not found");
      await store.update(ALERTS_STORE_NAME, (current) => {
        const { alerts } = alertsFileSchema.parse(current);
        const found = alerts.find((a) => a.id === id);
        if (!found) return { alerts };
        outcome = fn(found);
        if (!outcome.ok) return { alerts };
        const next = outcome.value;
        return { alerts: alerts.map((a) => (a.id === id ? next : a)) };
      });
      return outcome;
    },
  };
}
