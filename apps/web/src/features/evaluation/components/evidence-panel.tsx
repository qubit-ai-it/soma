import { Icon } from "@/shared/ui/icon";
import {
  formatNumber,
  NOT_EVALUABLE_MESSAGE,
  PROVENANCE_LABEL,
  QUALITY_LABEL,
  STATUS_COPY,
} from "../evaluation.labels";
import type { CheckpointView, SignalView } from "../evaluation.types";

function baselineText(signal: SignalView): string {
  if (signal.baseline.status !== "ready") {
    return `Insuficiente (${signal.baseline.sampleCount} de ${signal.baseline.minObservations} lecturas válidas)`;
  }
  const { center, variability, sampleCount } = signal.baseline;
  return `${formatNumber(center)} ${signal.unit} ± ${formatNumber(variability, 2)} (${sampleCount} lecturas)`;
}

function deviationText(signal: SignalView): string {
  if (!signal.deviation) return "No calculable";
  const { delta, normalizedDelta } = signal.deviation;
  const sign = delta > 0 ? "+" : "";
  const sigma =
    normalizedDelta === null ? "sin variabilidad" : `${sign}${formatNumber(normalizedDelta)} desviaciones`;
  return `${sign}${formatNumber(delta)} ${signal.unit} (${sigma})`;
}

function qualityText(signal: SignalView): string {
  const last = signal.points.at(-1);
  return last ? QUALITY_LABEL[last.quality] : "Sin lecturas";
}

function provenanceText(signal: SignalView): string {
  const { type, source, device } = signal.provenance;
  return [PROVENANCE_LABEL[type], source, device].filter(Boolean).join(" · ");
}

export function EvidencePanel({ checkpoint }: { checkpoint: CheckpointView }) {
  const { status, rules, limitations, signals } = checkpoint;
  return (
    <section aria-label="Por qué este estado" className="space-y-6 text-sm">
      <h3 className="text-xl">¿Por qué {STATUS_COPY[status].name}?</h3>

      {status === "NOT_EVALUABLE" && (
        <p className="rounded-md bg-secondary p-4 text-foreground">
          <Icon name="help" className="mr-2 align-middle" />
          {NOT_EVALUABLE_MESSAGE}
        </p>
      )}

      <div>
        <h4 className="font-heading font-bold">Reglas activadas</h4>
        {rules.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {rules.map((rule) => (
              <li key={rule.id} className="rounded-md bg-card p-3">
                <p>
                  <span className="font-heading font-bold">{rule.level}</span> · {rule.label}
                </p>
                <p className="mt-1 text-ink">{rule.description}</p>
                <p className="mt-1 text-xs text-ink">Regla {rule.id}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-ink">
            {status === "NOT_EVALUABLE"
              ? "Ninguna regla pudo evaluarse con los datos disponibles."
              : "Ninguna regla se activó: las señales siguen dentro de su variación habitual."}
          </p>
        )}
      </div>

      {limitations.length > 0 && (
        <div>
          <h4 className="font-heading font-bold">Limitaciones de los datos</h4>
          <ul className="mt-2 space-y-1">
            {limitations.map((limitation) => (
              <li key={limitation.code} className="flex gap-2 text-ink">
                <Icon name="warning" className="mt-0.5 shrink-0" />
                <span>{limitation.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="font-heading font-bold">Señales, baseline y calidad</h4>
        <div className="mt-2 overflow-x-auto rounded-md">
          <table className="w-full min-w-[640px] bg-card text-left">
            <thead className="bg-secondary text-ink">
              <tr>
                <th scope="col" className="px-3 py-2 font-normal">Señal</th>
                <th scope="col" className="px-3 py-2 font-normal">Baseline</th>
                <th scope="col" className="px-3 py-2 font-normal">Último valor válido</th>
                <th scope="col" className="px-3 py-2 font-normal">Desviación</th>
                <th scope="col" className="px-3 py-2 font-normal">Calidad de la última lectura</th>
                <th scope="col" className="px-3 py-2 font-normal">Procedencia</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal) => (
                <tr key={signal.signal} className="odd:bg-muted">
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    {signal.label}
                    {signal.firedRuleIds.length > 0 && (
                      <span className="block text-xs text-ink">
                        Regla activa: {signal.firedRuleIds.join(", ")}
                      </span>
                    )}
                  </th>
                  <td className="px-3 py-2">{baselineText(signal)}</td>
                  <td className="px-3 py-2">
                    {signal.latest ? `${formatNumber(signal.latest.value)} ${signal.unit}` : "Sin valor"}
                  </td>
                  <td className="px-3 py-2">{deviationText(signal)}</td>
                  <td className="px-3 py-2">{qualityText(signal)}</td>
                  <td className="px-3 py-2">{provenanceText(signal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
