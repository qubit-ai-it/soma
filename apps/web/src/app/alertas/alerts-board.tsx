"use client";

import { alertsVisibleTo, projectAlert } from "@/features/alerts/alerts.logic";
import { openLevels } from "@/features/alerts/alerts.display";
import type { Alert, AuditEntry } from "@/features/alerts/alerts.types";
import { DEMO_ACTORS, ROLE_LABELS, buildOperationalSummary, canAccess } from "@/features/roles/roles.logic";
import { useDemoRole } from "@/features/roles/roles.store";

import { AlertCard } from "./alert-card";
import { AuditTrail } from "./audit-trail";

type Props = {
  alerts: Alert[];
  entries: AuditEntry[];
  chainValid: boolean;
};

export function AlertsBoard({ alerts, entries, chainValid }: Props) {
  const role = useDemoRole();
  const viewer = { role, memberId: DEMO_ACTORS[role].memberId };
  const visible = alertsVisibleTo(alerts, viewer)
    .map((alert) => projectAlert(alert, viewer))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const summary = canAccess(role, "operational_summary") ? buildOperationalSummary(openLevels(alerts)) : null;

  return (
    <div className="space-y-10">
      {summary && (
        <section aria-label="Resumen operativo" className="space-y-2 rounded-md bg-card p-5">
          <h2 className="text-xl font-heading font-bold">Resumen operativo</h2>
          <dl className="flex flex-wrap gap-6 text-sm">
            <div>
              <dt className="text-ink">Disponibles</dt>
              <dd className="font-heading text-2xl font-bold">{summary.availability.available}</dd>
            </div>
            <div>
              <dt className="text-ink">Limitados</dt>
              <dd className="font-heading text-2xl font-bold">{summary.availability.limited}</dd>
            </div>
            <div>
              <dt className="text-ink">No disponibles</dt>
              <dd className="font-heading text-2xl font-bold">{summary.availability.unavailable}</dd>
            </div>
            <div>
              <dt className="text-ink">Sin evaluar</dt>
              <dd className="font-heading text-2xl font-bold">{summary.availability.unknown}</dd>
            </div>
          </dl>
        </section>
      )}

      <section aria-label="Alertas" className="space-y-3">
        <h2 className="text-xl font-heading font-bold">Alertas · {ROLE_LABELS[role]}</h2>
        {visible.length === 0 ? (
          <p className="rounded-2xl bg-card p-5 text-base text-ink">Sin alertas para este rol.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>

      {canAccess(role, "audit_log") ? (
        <AuditTrail entries={entries} chainValid={chainValid} />
      ) : (
        <p className="rounded-md bg-card p-4 text-sm text-ink">
          El registro de auditoría no está disponible para este rol.
        </p>
      )}
    </div>
  );
}
