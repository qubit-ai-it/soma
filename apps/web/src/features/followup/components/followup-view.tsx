import {
  CONFIRMATION_BANNER,
  describeReason,
  describeStatus,
  FOLLOWUP_DISCLAIMER,
} from "../followup.display";
import type { FollowUpContract, FollowUpResult } from "../followup.types";

type Props = { title: string; contract: FollowUpContract; result: FollowUpResult };

const SIGNAL_LABELS: Record<string, string> = {
  sleepHours: "Sueño",
  hrv: "VFC (HRV)",
  fatigue: "Fatiga",
};

const day = (iso: string) => iso.slice(0, 10);
const percent = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)} %`);

export function FollowUpView({ title, contract, result }: Props) {
  const { stepDown, escalate, windows } = result;
  const required = contract.hysteresis.consecutiveWindows;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-heading text-lg font-bold">Seguimiento de la evolución</h2>
        <p className="text-sm">{title}</p>
        <p className="text-xs text-ink">{FOLLOWUP_DISCLAIMER}</p>
      </header>

      <p role="note" className="rounded-md bg-accent-soft p-4 text-sm">
        {CONFIRMATION_BANNER}
      </p>

      {escalate.notifyEarth && (
        <p role="alert" className="rounded-md bg-danger/15 p-4 text-sm font-medium">
          Empeorando: se sube el estado y se notifica a Tierra.
        </p>
      )}

      <section aria-label="Contrato de seguimiento" className="rounded-md bg-card p-5 text-sm">
        <h3 className="font-heading font-semibold">Contrato de seguimiento</h3>
        <ul className="mt-2 space-y-1">
          <li>Inicio del plan: {day(contract.planStartedAt)}</li>
          <li>Baseline congelado hasta: {day(contract.baselineFrozenAt)} (no se recalcula durante el tratamiento)</li>
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
      </section>

      <section aria-label="Ventanas de revisión" className="space-y-3">
        <h3 className="font-heading font-semibold">Ventanas de revisión</h3>
        {windows.length === 0 && <p className="text-sm text-ink">Aún no cierra ninguna ventana.</p>}
        {windows.map((w) => (
          <article key={w.windowId} aria-label={w.label} className="rounded-md bg-card p-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-heading font-semibold">{w.label}</h4>
              <span className="text-xs text-ink">
                {day(w.start)} a {day(w.end)}
              </span>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                Estado: {describeStatus(w.status)}
              </span>
            </div>

            {w.reasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
                {w.reasons.map((r) => (
                  <li key={r}>{describeReason(r)}</li>
                ))}
              </ul>
            )}

            <ul className="mt-3 space-y-0.5">
              {w.signals.map((s) => (
                <li key={s.signal}>
                  {SIGNAL_LABELS[s.signal] ?? s.signal}: {describeStatus(s.status)} · recuperado{" "}
                  {percent(s.recoveredFraction)} de la desviación inicial · {s.observationCount} obs.
                </li>
              ))}
            </ul>

            <p className="mt-3 text-xs text-ink">
              {w.adherence
                ? `Adherencia: ${w.adherence.stepsDone}/${w.adherence.stepsPlanned} pasos · ${w.adherence.xrSessionsDone}/${w.adherence.xrSessionsPlanned} sesión XR`
                : "Adherencia: sin registro"}
            </p>
          </article>
        ))}
      </section>

      <section aria-label="Histéresis" className="rounded-md bg-card p-5 text-sm">
        <h3 className="font-heading font-semibold">Bajar el estado</h3>
        <p className="mt-2">
          Ventanas consecutivas mejorando: {result.consecutiveImproving} de {required} necesarias.
        </p>
        <p className="mt-1">
          {stepDown.proposed
            ? "Se cumple la histéresis: se propone bajar el estado, pendiente de confirmación humana. No se aplica automáticamente."
            : "Todavía no se propone bajar el estado."}
        </p>
      </section>
    </div>
  );
}
