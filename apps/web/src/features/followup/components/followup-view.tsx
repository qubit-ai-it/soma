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
  sleepHours: "Sueño",
  hrv: "VFC (HRV)",
  fatigue: "Fatiga",
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
      <h2 className="font-heading text-2xl font-bold">Seguimiento</h2>

      {escalate.notifyEarth && (
        <div role="alert" className={GRID}>
          <SomaCard title="Empeora: sube el estado" line="Se notifica a Tierra." chip="Aviso" tone="danger" />
        </div>
      )}

      <section aria-label="Ventanas de revisión" className="space-y-4">
        <h3 className="font-heading text-lg font-bold">Ventanas de revisión</h3>
        {windows.length === 0 && <p className="text-base text-muted-foreground">Aún no cierra ninguna ventana.</p>}
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
                    ? `Adherencia ${w.adherence.stepsDone}/${w.adherence.stepsPlanned} pasos.`
                    : "Sin registro de adherencia."
              }
              chip={w.label}
              tone={TONE[w.status]}
              detail={
                <>
                  <p>
                    {day(w.start)} a {day(w.end)}
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
                        {SIGNAL_LABELS[s.signal] ?? s.signal}: {describeStatus(s.status)} · recuperado{" "}
                        {percent(s.recoveredFraction)} · {s.observationCount} obs.
                      </li>
                    ))}
                  </ul>
                  <p>
                    {w.adherence
                      ? `Adherencia: ${w.adherence.stepsDone}/${w.adherence.stepsPlanned} pasos · ${w.adherence.xrSessionsDone}/${w.adherence.xrSessionsPlanned} sesión XR`
                      : "Adherencia: sin registro"}
                  </p>
                </>
              }
            />
          ))}
        </div>
      </section>

      <div className={GRID}>
        <SomaCard
          label="Histéresis"
          title={CONFIRMATION_BANNER}
          line={`Mejorando ${result.consecutiveImproving} de ${required} ventanas.`}
          chip={stepDown.proposed ? "Propuesto" : "Aún no"}
          tone={stepDown.proposed ? "ok" : "neutral"}
          detail={
            <>
              <p>{CONFIRMATION_LINE}</p>
              <p>
                {stepDown.proposed
                  ? "Se cumple la histéresis: se propone bajar el estado, pendiente de confirmación humana."
                  : "Todavía no se propone bajar el estado."}
              </p>
            </>
          }
        />

        <SomaCard
          label="Contrato de seguimiento"
          title="Contrato de seguimiento"
          line={`Baseline congelado hasta ${day(contract.baselineFrozenAt)}.`}
          chip="Baseline fijo"
          detail={
            <ul className="space-y-1">
              <li>Inicio del plan: {day(contract.planStartedAt)}</li>
              <li>Baseline congelado hasta: {day(contract.baselineFrozenAt)} (no se recalcula)</li>
              {contract.targets.map((t) => (
                <li key={t.signal}>
                  {SIGNAL_LABELS[t.signal] ?? t.signal}: se espera que{" "}
                  {t.expectedDirection === "increase" ? "suba" : "baje"} hacia el baseline
                </li>
              ))}
              <li>
                Adherencia mínima: {Math.round(contract.adherence.minRatio * 100)} % de pasos y sesiones XR
              </li>
            </ul>
          }
        />
      </div>
    </div>
  );
}
