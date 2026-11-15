import type { Result } from "../../shared/result.ts";
import type { Alert, AuditEntry, NewAuditEntry } from "./alerts.types.ts";

export type AuditRepository = {
  list: () => Promise<AuditEntry[]>;
  // Append-only: there is no update or delete. A repeated idempotency key returns the existing entry.
  append: (input: NewAuditEntry) => Promise<{ entry: AuditEntry; duplicate: boolean }>;
};

export type AlertsRepository = {
  list: () => Promise<Alert[]>;
  get: (id: string) => Promise<Alert | null>;
  add: (alert: Alert) => Promise<{ alert: Alert; duplicate: boolean }>;
  // Runs fn on the stored alert inside the store lock; persists only on ok
  transition: (id: string, fn: (alert: Alert) => Result<Alert>) => Promise<Result<Alert>>;
};
