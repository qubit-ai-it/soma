import { SomaCard, type CardTone } from "@/shared/ui/soma-card";

import {
  CONFIRMATION_BANNER,
  CONFIRMATION_LINE,
  describeReason,
  describeStatus,
} from "../followup.display";
import type { FollowUpContract, FollowUpResult, FollowUpStatus } from "../followup.types";

type Props = { contract: FollowUpContract; result: FollowUpResult };

const SIGNAL_LABELS: Record<string, string> = {
  sleepHours: "Sleep",
  hrv: "HRV",
  fatigue: "Fatigue",
};

const TONE: Record<FollowUpStatus, CardTone> = {
  improving: "ok",
  stable: "neutral",
  worsening: "danger",
  "not-evaluable": "info",
};

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

const day = (iso: string) => iso.slice(0, 10);
const percent = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)} %`);

export function FollowUpView({ contract, result }: Props) {
  const { stepDown, escalate, windows } = result;
  const required = contract.hysteresis.consecutiveWindows;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Follow-up</h2>

      {escalate.notifyEarth && (
        <div role="alert" className={GRID}>
          <SomaCard title="Worsening: raise the status" line="Earth is notified." chip="Notice" tone="danger" />
        </div>
      )}

      <section aria-label="Review windows" className="space-y-4">
        <h3 className="font-heading text-lg font-bold">Review windows</h3>
        {windows.length === 0 && <p className="text-base text-muted-foreground">No window has closed yet.</p>}
        <div className={GRID}>
          {windows.map((w) => (
            <SomaCard
              key={w.windowId}
              label={w.label}
              title={describeStatus(w.status)}
              line={
                w.reasons.length > 0
                  ? describeReason(w.reasons[0])
                  : w.adherence
                    ? `Adherence ${w.adherence.stepsDone}/${w.adherence.stepsPlanned} steps.`
                    : "No adherence record."
              }
              chip={w.label}
              tone={TONE[w.status]}
              detail={
                <>
                  <p>
                    {day(w.start)} to {day(w.end)}
                  </p>
                  {w.reasons.length > 0 && (
                    <ul className="list-disc space-y-0.5 pl-5">
                      {w.reasons.map((r) => (
                        <li key={r}>{describeReason(r)}</li>
                      ))}
                    </ul>
                  )}
                  <ul className="space-y-0.5">
                    {w.signals.map((s) => (
                      <li key={s.signal}>
                        {SIGNAL_LABELS[s.signal] ?? s.signal}: {describeStatus(s.status)} · recovered{" "}
                        {percent(s.recoveredFraction)} · {s.observationCount} obs.
                      </li>
                    ))}
                  </ul>
                  <p>
                    {w.adherence
                      ? `Adherence: ${w.adherence.stepsDone}/${w.adherence.stepsPlanned} steps · ${w.adherence.xrSessionsDone}/${w.adherence.xrSessionsPlanned} XR session`
                      : "Adherence: no record"}
                  </p>
                </>
              }
            />
          ))}
        </div>
      </section>

      <div className={GRID}>
        <SomaCard
          label="Hysteresis"
          title={CONFIRMATION_BANNER}
          line={`Improving ${result.consecutiveImproving} of ${required} windows.`}
          chip={stepDown.proposed ? "Proposed" : "Not yet"}
          tone={stepDown.proposed ? "ok" : "neutral"}
          detail={
            <>
              <p>{CONFIRMATION_LINE}</p>
              <p>
                {stepDown.proposed
                  ? "Hysteresis is met: lowering the status is proposed, pending human confirmation."
                  : "Lowering the status is not proposed yet."}
              </p>
            </>
          }
        />

        <SomaCard
          label="Follow-up contract"
          title="Follow-up contract"
          line={`Baseline frozen until ${day(contract.baselineFrozenAt)}.`}
          chip="Fixed baseline"
          detail={
            <ul className="space-y-1">
              <li>Plan start: {day(contract.planStartedAt)}</li>
              <li>Baseline frozen until: {day(contract.baselineFrozenAt)} (not recalculated)</li>
              {contract.targets.map((t) => (
                <li key={t.signal}>
                  {SIGNAL_LABELS[t.signal] ?? t.signal}: expected to{" "}
                  {t.expectedDirection === "increase" ? "rise" : "fall"} toward the baseline
                </li>
              ))}
              <li>
                Minimum adherence: {Math.round(contract.adherence.minRatio * 100)} % of steps and XR sessions
              </li>
            </ul>
          }
        />
      </div>
    </div>
  );
}
