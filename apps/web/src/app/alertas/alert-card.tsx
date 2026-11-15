"use client";

import { useState, useTransition } from "react";

import { LEVEL_LABELS, STATUS_LABELS, formatDateTime } from "@/features/alerts/alerts.display";
import type { Alert } from "@/features/alerts/alerts.types";
import { ROLE_LABELS, DEMO_ACTORS, canAccess } from "@/features/roles/roles.logic";
import { useDemoRole } from "@/features/roles/roles.store";
import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";

import { acknowledgeAlertAction, closeAlertAction } from "./actions";

export function AlertCard({ alert }: { alert: Alert }) {
  const role = useDemoRole();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState("");
  const status = STATUS_LABELS[alert.status];
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

  return (
    <article aria-label={alert.title} className="space-y-3 rounded-md bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-lg font-bold">{alert.title}</h3>
          <p className="text-sm text-ink">
            {alert.memberLabel} · {LEVEL_LABELS[alert.level]} · {formatDateTime(alert.createdAt)}
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-0.5 text-sm">
          <Icon name={status.icon} />
          {status.text}
        </span>
      </header>

      <p className="text-sm">Acción: {alert.action}</p>
      <p className="text-xs text-ink">
        Destinatarios: {alert.recipients.map((r) => ROLE_LABELS[r]).join(", ")}
      </p>

      {alert.clinicalDetail ? (
        <p className="rounded-md bg-secondary p-3 text-sm">
          <span className="text-ink">Detalle clínico (solo médico de a bordo y persona afectada): </span>
          {alert.clinicalDetail}
        </p>
      ) : (
        <p className="text-xs text-ink">
          Detalle clínico no disponible para este rol (información mínima necesaria).
        </p>
      )}

      {alert.acknowledged && (
        <p className="text-sm text-ink">
          Reconocida por {alert.acknowledged.actorId} ({ROLE_LABELS[alert.acknowledged.role]}) ·{" "}
          {formatDateTime(alert.acknowledged.at)}
        </p>
      )}
      {alert.closed && (
        <p className="text-sm text-ink">
          Cerrada por {alert.closed.actorId} ({ROLE_LABELS[alert.closed.role]}) ·{" "}
          {formatDateTime(alert.closed.at)} · Nota: {alert.closed.note}
        </p>
      )}

      {alert.status === "open" && canAccess(role, "alert_acknowledge") && (
        <Button disabled={pending} onClick={() => run(() => acknowledgeAlertAction({ ...caller, alertId: alert.id }))}>
          <Icon name="visibility" />
          Reconocer como {DEMO_ACTORS[role].id}
        </Button>
      )}

      {alert.status === "acknowledged" && canAccess(role, "alert_close") && (
        <div className="space-y-2">
          {closing ? (
            <>
              <label className="block text-sm text-ink">
                Nota de cierre (obligatoria)
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-1 w-full rounded-md bg-secondary p-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <div className="flex gap-2">
                <Button
                  disabled={pending}
                  onClick={() => run(() => closeAlertAction({ ...caller, alertId: alert.id, note }))}
                >
                  Cerrar alerta
                </Button>
                <Button variant="ghost" disabled={pending} onClick={() => setClosing(false)}>
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <Button variant="outline" disabled={pending} onClick={() => setClosing(true)}>
              <Icon name="task_alt" />
              Cerrar alerta
            </Button>
          )}
        </div>
      )}

      {alert.status === "open" && !canAccess(role, "alert_acknowledge") && (
        <p className="text-xs text-ink">
          El sistema nunca cierra alertas: este rol no puede reconocerlas. Cambia el rol en el selector.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
