import { ACTION_LABELS, formatDateTime } from "@/features/alerts/alerts.display";
import type { AuditEntry } from "@/features/alerts/alerts.types";
import { DECISION_LABELS } from "@/features/earth/earth.display";
import { ROLE_LABELS } from "@/features/roles/roles.logic";
import { Icon } from "@/shared/ui/icon";

function actorText(entry: AuditEntry): string {
  return entry.actor.kind === "human"
    ? `${entry.actor.id} (${ROLE_LABELS[entry.actor.role]})`
    : `${entry.actor.id} (sistema)`;
}

export function AuditTrail({ entries, chainValid }: { entries: AuditEntry[]; chainValid: boolean }) {
  const ordered = [...entries].sort((a, b) => b.seq - a.seq);

  return (
    <section aria-label="Registro de auditoría" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-heading font-bold">Registro de auditoría</h2>
        <a
          href="/alertas/export"
          download
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary px-4 font-heading text-sm font-semibold outline-none transition-colors duration-[var(--duration-micro)] hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name="download" />
          Exportar JSON
        </a>
      </div>
      <p className="flex items-center gap-2 text-sm text-ink">
        <Icon name={chainValid ? "verified" : "gpp_maybe"} />
        {chainValid
          ? "Cadena de hashes íntegra: solo se agregan entradas, nunca se editan."
          : "Cadena de hashes alterada: el registro fue modificado."}
      </p>
      <ol className="space-y-2">
        {ordered.map((entry) => (
          <li key={entry.id} className="space-y-2 rounded-md bg-card p-4 text-sm">
            <p className="font-heading font-semibold">
              #{entry.seq} · {ACTION_LABELS[entry.action]}
            </p>
            <p className="text-ink">
              {formatDateTime(entry.at)} · {actorText(entry)}
              {entry.subjectId && ` · Sujeto ${entry.subjectId}`}
              {entry.alertId && ` · Alerta ${entry.alertId}`}
            </p>
            {entry.detail && <p className="text-ink">{entry.detail}</p>}
            {entry.aiProposal && entry.humanDecision && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md bg-secondary p-3">
                  <p className="font-heading font-semibold">Propuesta de IA</p>
                  <p className="text-xs text-ink">
                    {entry.aiProposal.provider} · versión {entry.aiProposal.version}
                  </p>
                  <p className="mt-1">{entry.aiProposal.title}</p>
                  <ol className="mt-1 list-decimal pl-5 text-ink">
                    {entry.aiProposal.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div className="rounded-md bg-secondary p-3">
                  <p className="font-heading font-semibold">
                    Decisión humana: {DECISION_LABELS[entry.humanDecision.decision]}
                  </p>
                  <p className="text-xs text-ink">{actorText(entry)}</p>
                  {entry.humanDecision.note && <p className="mt-1">Nota: {entry.humanDecision.note}</p>}
                  {entry.humanDecision.steps && (
                    <ol className="mt-1 list-decimal pl-5 text-ink">
                      {entry.humanDecision.steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
