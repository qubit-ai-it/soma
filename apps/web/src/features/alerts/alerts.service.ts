import { randomUUID } from "node:crypto";

import { err, ok, type Result } from "../../shared/result.ts";
import type { Packet } from "../earth/earth.types.ts";
import { buildF3Notification } from "../roles/roles.logic.ts";
import type { Level, Role } from "../roles/roles.types.ts";
import { acknowledgeAlert, buildAlert, closeAlert, escalationFor } from "./alerts.logic.ts";
import type { AlertsRepository, AuditRepository } from "./alerts.repository.ts";
import type { Alert } from "./alerts.types.ts";

type EnqueueToEarth = (input: {
  idempotencyKey: string;
  kind: "alert_notification";
  direction: "to_earth";
  payload: Packet["payload"];
}) => Promise<unknown>;

type Deps = {
  alerts: AlertsRepository;
  audit: AuditRepository;
  enqueueToEarth: EnqueueToEarth;
  now?: () => string;
  makeId?: () => string;
};

export type RaiseAlertInput = {
  memberId: string;
  memberLabel: string;
  level: Level;
  title: string;
  action: string;
  clinicalDetail?: string;
  // Same key, same alert: lets a caller retry safely
  alertId?: string;
};

export type AlertService = ReturnType<typeof createAlertService>;

export function createAlertService({
  alerts,
  audit,
  enqueueToEarth,
  now = () => new Date().toISOString(),
  makeId = () => randomUUID(),
}: Deps) {
  return {
    async raise(input: RaiseAlertInput): Promise<Result<Alert>> {
      const at = now();
      const built = buildAlert({ ...input, id: input.alertId ?? `al-${makeId()}`, now: at });
      if (!built.ok) return built;

      const { alert, duplicate } = await alerts.add(built.value);
      if (duplicate) return ok(alert);

      await audit.append({
        action: "alert_raised",
        actor: { kind: "system", id: "deterministic-engine" },
        alertId: alert.id,
        subjectId: alert.memberId,
        detail: `Nivel ${alert.level}; destinatarios: ${alert.recipients.join(", ")}`,
        idempotencyKey: `raised:${alert.id}`,
      });

      if (escalationFor(alert.level).notifiesEarth) {
        const notification = buildF3Notification({
          level: alert.level,
          subjectId: alert.memberId,
          action: alert.action,
          issuedAt: at,
        });
        if (!notification.ok) return err(notification.error);
        await enqueueToEarth({
          idempotencyKey: `alert-notify:${alert.id}`,
          kind: "alert_notification",
          direction: "to_earth",
          payload: { ...notification.value, alertId: alert.id },
        });
      }
      return ok(alert);
    },

    async acknowledge(input: { alertId: string; actorId: string; role: Role }): Promise<Result<Alert>> {
      const result = await alerts.transition(input.alertId, (alert) =>
        acknowledgeAlert(alert, { actorId: input.actorId, role: input.role, now: now() }),
      );
      if (result.ok) {
        await audit.append({
          action: "alert_acknowledged",
          actor: { kind: "human", id: result.value.acknowledged!.actorId, role: input.role },
          alertId: result.value.id,
          subjectId: result.value.memberId,
          idempotencyKey: `ack:${result.value.id}`,
        });
      }
      return result;
    },

    async close(input: {
      alertId: string;
      actorId: string;
      role: Role;
      note: string;
    }): Promise<Result<Alert>> {
      const result = await alerts.transition(input.alertId, (alert) =>
        closeAlert(alert, { actorId: input.actorId, role: input.role, note: input.note, now: now() }),
      );
      if (result.ok) {
        await audit.append({
          action: "alert_closed",
          actor: { kind: "human", id: result.value.closed!.actorId, role: input.role },
          alertId: result.value.id,
          subjectId: result.value.memberId,
          detail: result.value.closed!.note,
          idempotencyKey: `close:${result.value.id}`,
        });
      }
      return result;
    },
  };
}
