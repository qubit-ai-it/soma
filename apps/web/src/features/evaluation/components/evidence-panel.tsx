import { Icon } from "@/shared/ui/icon";
import { SomaCard } from "@/shared/ui/soma-card";
import { formatNumber, QUALITY_LABEL } from "../evaluation.labels";
import type { CheckpointView, SignalView } from "../evaluation.types";

const TOP_REASONS = 3;

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

export function EvidencePanel({ checkpoint }: { checkpoint: CheckpointView }) {
  const { status, rules, limitations, signals } = checkpoint;
  const top = rules.slice(0, TOP_REASONS);
  const emptyText =
    status === "NOT_EVALUABLE"
      ? "Ninguna regla pudo evaluarse."
      : "Ninguna regla activada: todo habitual.";

  const detail = (
    <div className="space-y-5">
      {rules.length > TOP_REASONS && (
        <ul className="space-y-2">
          {rules.slice(TOP_REASONS).map((rule) => (
            <li key={rule.id}>
              <span className="font-heading font-bold">{rule.level}</span> · {rule.label}
              <span className="block text-xs">
                {rule.description} · Regla {rule.id}
              </span>
            </li>
          ))}
        </ul>
      )}

      {limitations.length > 0 && (
        <div>
          <h4 className="font-heading font-bold">Limitaciones</h4>
          <ul className="mt-2 space-y-1">
            {limitations.map((limitation) => (
              <li key={limitation.code} className="flex gap-2">
                <Icon name="warning" className="mt-0.5 shrink-0" />
                <span>{limitation.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="font-heading font-bold">Señales y baseline</h4>
        <div className="mt-2 overflow-x-auto rounded-xl">
          <table className="w-full min-w-[640px] bg-secondary text-left">
            <thead className="text-ink">
              <tr>
                <th scope="col" className="px-3 py-2 font-normal">Señal</th>
                <th scope="col" className="px-3 py-2 font-normal">Baseline</th>
                <th scope="col" className="px-3 py-2 font-normal">Último valor válido</th>
                <th scope="col" className="px-3 py-2 font-normal">Desviación</th>
                <th scope="col" className="px-3 py-2 font-normal">Calidad</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal) => (
                <tr key={signal.signal}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <SomaCard label="Por qué este estado" title="¿Por qué?" detail={detail}>
      {top.length > 0 ? (
        <ul className="space-y-2">
          {top.map((rule) => (
            <li key={rule.id} className="flex gap-2 text-base">
              <Icon name="arrow_right" className="mt-0.5 shrink-0" />
              <span>{rule.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-muted-foreground">{emptyText}</p>
      )}
    </SomaCard>
  );
}
