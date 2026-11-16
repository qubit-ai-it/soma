import { generatedBy } from "@/features/sentry/sentry.display";
import { SomaCard, type CardTone } from "@/shared/ui/soma-card";

import { describeReason, describeStatus } from "../followup.display";
import type { FollowUpRecord } from "../followup.record";
import type { FollowUpStatus, NotEvaluableReason } from "../followup.types";

const TONE: Record<FollowUpStatus, CardTone> = {
  improving: "ok",
  stable: "neutral",
  worsening: "danger",
  "not-evaluable": "info",
};

const SIGNAL_LABELS: Record<string, string> = { heartRate: "Frecuencia cardíaca" };

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
const when = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

export function StoredFollowUpView({ record, nowMs }: { record: FollowUpRecord; nowMs: number }) {
  const { contract } = record;
  const closed = record.reports.length;

  return (
    <section aria-label="Seguimiento de Sentry" className="space-y-4">
      <h2 className="font-heading text-2xl font-bold">Seguimiento</h2>

      <div className={GRID}>
        <SomaCard
          title={record.status === "closed" ? "Seguimiento completo" : "Seguimiento activo"}
          line={`${closed} de ${contract.windows.length} ventanas cerradas`}
          chip={record.status === "closed" ? "Cerrado" : "Activo"}
          tone={record.status === "closed" ? "ok" : "info"}
          footer={generatedBy(record.createdAt, nowMs)}
          detailLabel="Ver contrato"
          detail={
            <>
              <p>Inicio del plan: {when(contract.planStartedAt)}</p>
              <p>Línea base congelada: {when(contract.baselineFrozenAt)}</p>
              <p>
                Objetivo:{" "}
                {contract.targets
                  .map((t) => `${SIGNAL_LABELS[t.signal] ?? t.signal} (${t.expectedDirection === "decrease" ? "bajar" : "subir"})`)
                  .join(", ")}
              </p>
            </>
          }
        />

        {contract.windows.map((window) => {
          const report = record.reports.find((r) => r.windowId === window.id);
          if (!report) {
            return (
              <SomaCard
                key={window.id}
                label={window.label}
                title="Abierta"
                line={`Cierra ${when(window.end)}`}
                chip="Pendiente"
                tone="neutral"
              />
            );
          }
          const reason = report.reasons[0] as NotEvaluableReason | undefined;
          return (
            <SomaCard
              key={window.id}
              label={window.label}
              title={describeStatus(report.status)}
              line={reason ? describeReason(reason) : undefined}
              chip={report.escalate ? "Se notifica a Tierra" : window.label}
              tone={TONE[report.status]}
              footer={generatedBy(report.reportedAt, nowMs)}
              detailLabel="Ver detalle"
              detail={
                <>
                  <p>
                    {when(window.start)} a {when(window.end)}
                  </p>
                  {report.feedback.map((item) => (
                    <p key={item.responseId} className="rounded-md bg-secondary p-3">
                      <span className="font-semibold">{item.decision === "ack" ? "Tierra vio el reporte" : "Tierra comentó"}</span>
                      {item.note ? ` · ${item.note}` : ""}
                    </p>
                  ))}
                  {report.reasons.length > 1 && (
                    <ul className="list-disc pl-5">
                      {report.reasons.map((r) => (
                        <li key={r}>{describeReason(r as NotEvaluableReason)}</li>
                      ))}
                    </ul>
                  )}
                </>
              }
            />
          );
        })}
      </div>
    </section>
  );
}
