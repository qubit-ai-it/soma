"use client";

import { useState, useTransition } from "react";

import { STATUS_LABELS, formatDateTime } from "@/features/alerts/alerts.display";
import type { Alert } from "@/features/alerts/alerts.types";
import { DEMO_ACTORS, ROLE_LABELS, canAccess } from "@/features/roles/roles.logic";
import { useDemoRole } from "@/features/roles/roles.store";
import { SomaCard, type CardAction, type CardTone } from "@/shared/ui/soma-card";

import { acknowledgeAlertAction, closeAlertAction } from "./actions";

const TONE: Record<Alert["level"], CardTone> = { F2: "warn", F3: "danger", NOT_EVALUABLE: "info" };
const CHIP: Record<Alert["level"], string> = { F2: "F2", F3: "F3", NOT_EVALUABLE: "No evaluable" };

export function AlertCard({ alert }: { alert: Alert }) {
  const role = useDemoRole();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState("");
  const caller = { role, actorId: DEMO_ACTORS[role].id };

  function run(call: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const result = await call();
      setError(result.ok ? null : (result.error ?? "No se pudo completar la acción."));
      if (result.ok) {
        setClosing(false);
        setNote("");
      }
    });
  }

  const actions: CardAction[] = [];
  if (alert.status === "open" && canAccess(role, "alert_acknowledge")) {
    actions.push({
      label: "Reconocer",
      icon: "visibility",
      disabled: pending,
      onClick: () => run(() => acknowledgeAlertAction({ ...caller, alertId: alert.id })),
    });
  }
  if (alert.status === "acknowledged" && canAccess(role, "alert_close")) {
    if (closing) {
      actions.push(
        {
          label: "Cerrar alerta",
          disabled: pending || note.trim().length < 3,
          onClick: () => run(() => closeAlertAction({ ...caller, alertId: alert.id, note })),
        },
        { label: "Cancelar", variant: "secondary", disabled: pending, onClick: () => setClosing(false) },
      );
    } else {
      actions.push({ label: "Cerrar alerta", icon: "task_alt", onClick: () => setClosing(true) });
    }
  }

  const status = STATUS_LABELS[alert.status];
  const tone: CardTone = alert.status === "closed" ? "ok" : TONE[alert.level];
  const chip = alert.status === "closed" ? status.text : `${CHIP[alert.level]} · ${status.text}`;
  const blocked = alert.status === "open" && !canAccess(role, "alert_acknowledge");

  return (
    <SomaCard
      title={alert.title}
      line={alert.action}
      chip={chip}
      tone={tone}
      actions={actions}
      footer={blocked ? "Cambia de rol para actuar." : undefined}
      detail={
        <>
          <p>
            {alert.memberLabel} · {formatDateTime(alert.createdAt)}
          </p>
          <p>Para: {alert.recipients.map((r) => ROLE_LABELS[r]).join(", ")}</p>
          <p>
            {alert.clinicalDetail
              ? `Detalle clínico: ${alert.clinicalDetail}`
              : "Detalle clínico no disponible para este rol."}
          </p>
          {alert.acknowledged && (
            <p>
              Reconocida por {alert.acknowledged.actorId} · {formatDateTime(alert.acknowledged.at)}
            </p>
          )}
          {alert.closed && (
            <p>
              Cerrada por {alert.closed.actorId} · {alert.closed.note}
            </p>
          )}
        </>
      }
    >
      {closing && (
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nota de cierre"
          aria-label="Nota de cierre"
          className="h-11 w-full rounded-full bg-secondary px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </SomaCard>
  );
}
