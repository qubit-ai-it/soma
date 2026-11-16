import { Icon } from "@/shared/ui/icon";
import { SomaCard } from "@/shared/ui/soma-card";
import { formatNumber, QUALITY_LABEL } from "../evaluation.labels";
import type { CheckpointView, SignalView } from "../evaluation.types";

const TOP_REASONS = 3;

function baselineText(signal: SignalView): string {
  if (signal.baseline.status !== "ready") {
    return `Insufficient (${signal.baseline.sampleCount} of ${signal.baseline.minObservations} valid readings)`;
  }
  const { center, variability, sampleCount } = signal.baseline;
  return `${formatNumber(center)} ${signal.unit} ± ${formatNumber(variability, 2)} (${sampleCount} readings)`;
}

function deviationText(signal: SignalView): string {
  if (!signal.deviation) return "Not computable";
  const { delta, normalizedDelta } = signal.deviation;
  const sign = delta > 0 ? "+" : "";
  const sigma =
    normalizedDelta === null ? "no variability" : `${sign}${formatNumber(normalizedDelta)} deviations`;
  return `${sign}${formatNumber(delta)} ${signal.unit} (${sigma})`;
}

function qualityText(signal: SignalView): string {
  const last = signal.points.at(-1);
  return last ? QUALITY_LABEL[last.quality] : "No readings";
}

export function EvidencePanel({ checkpoint }: { checkpoint: CheckpointView }) {
  const { status, rules, limitations, signals } = checkpoint;
  const top = rules.slice(0, TOP_REASONS);
  const emptyText =
    status === "NOT_EVALUABLE"
      ? "No rule could be evaluated."
      : "No rule triggered: all within the usual range.";

  const detail = (
    <div className="space-y-5">
      {rules.length > TOP_REASONS && (
        <ul className="space-y-2">
          {rules.slice(TOP_REASONS).map((rule) => (
            <li key={rule.id}>
              <span className="font-heading font-bold">{rule.level}</span> · {rule.label}
              <span className="block text-xs">
                {rule.description} · Rule {rule.id}
              </span>
            </li>
          ))}
        </ul>
      )}

      {limitations.length > 0 && (
        <div>
          <h4 className="font-heading font-bold">Limitations</h4>
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
        <h4 className="font-heading font-bold">Signals and baseline</h4>
        <div className="mt-2 overflow-x-auto rounded-xl">
          <table className="w-full min-w-[640px] bg-secondary text-left">
            <thead className="text-ink">
              <tr>
                <th scope="col" className="px-3 py-2 font-normal">Signal</th>
                <th scope="col" className="px-3 py-2 font-normal">Baseline</th>
                <th scope="col" className="px-3 py-2 font-normal">Last valid value</th>
                <th scope="col" className="px-3 py-2 font-normal">Deviation</th>
                <th scope="col" className="px-3 py-2 font-normal">Quality</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal) => (
                <tr key={signal.signal}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    {signal.label}
                    {signal.firedRuleIds.length > 0 && (
                      <span className="block text-xs text-ink">
                        Active rule: {signal.firedRuleIds.join(", ")}
                      </span>
                    )}
                  </th>
                  <td className="px-3 py-2">{baselineText(signal)}</td>
                  <td className="px-3 py-2">
                    {signal.latest ? `${formatNumber(signal.latest.value)} ${signal.unit}` : "No value"}
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
    <SomaCard label="Why this status" title="Why?" detail={detail}>
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
