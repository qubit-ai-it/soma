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

const SIGNAL_LABELS: Record<string, string> = { heartRate: "Heart rate" };

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
const when = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

export function StoredFollowUpView({ record, nowMs }: { record: FollowUpRecord; nowMs: number }) {
  const { contract } = record;
  const closed = record.reports.length;

  return (
    <section aria-label="Sentry follow-up" className="space-y-4">
      <h2 className="font-heading text-2xl font-bold">Follow-up</h2>

      <div className={GRID}>
        <SomaCard
          title={record.status === "closed" ? "Follow-up complete" : "Follow-up active"}
          line={`${closed} of ${contract.windows.length} windows closed`}
          chip={record.status === "closed" ? "Closed" : "Active"}
          tone={record.status === "closed" ? "ok" : "info"}
          footer={generatedBy(record.createdAt, nowMs)}
          detailLabel="View contract"
          detail={
            <>
              <p>Plan start: {when(contract.planStartedAt)}</p>
              <p>Baseline frozen: {when(contract.baselineFrozenAt)}</p>
              <p>
                Target:{" "}
                {contract.targets
                  .map((t) => `${SIGNAL_LABELS[t.signal] ?? t.signal} (${t.expectedDirection === "decrease" ? "lower" : "raise"})`)
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
                title="Open"
                line={`Closes ${when(window.end)}`}
                chip="Pending"
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
              chip={report.escalate ? "Earth is notified" : window.label}
              tone={TONE[report.status]}
              footer={generatedBy(report.reportedAt, nowMs)}
              detailLabel="View details"
              detail={
                <>
                  <p>
                    {when(window.start)} to {when(window.end)}
                  </p>
                  {report.feedback.map((item) => (
                    <p key={item.responseId} className="rounded-md bg-secondary p-3">
                      <span className="font-semibold">{item.decision === "ack" ? "Earth saw the report" : "Earth commented"}</span>
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
