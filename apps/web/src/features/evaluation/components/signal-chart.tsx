import { buildChart } from "../evaluation.chart";
import { formatNumber } from "../evaluation.labels";
import type { SignalView } from "../evaluation.types";

const LAYOUT = { width: 320, height: 130, padX: 14, padY: 14 };

function describe(signal: SignalView): string {
  const valid = signal.points.filter((p) => p.value !== null).length;
  const gaps = signal.points.length - valid;
  const band =
    signal.baseline.status === "ready"
      ? `banda del baseline de ${formatNumber(signal.baseline.band.low)} a ${formatNumber(signal.baseline.band.high)} ${signal.unit}`
      : "sin banda de baseline por baseline insuficiente";
  return `${signal.label}: ${valid} lecturas${gaps > 0 ? `, ${gaps} sin dato` : ""}, ${band}.`;
}

export function SignalChart({ signal }: { signal: SignalView }) {
  const chart = buildChart(signal, LAYOUT);
  const lastDot = chart.dots.at(-1);
  const baselineBand = signal.baseline.status === "ready" ? signal.baseline.band : null;

  return (
    <figure className="rounded-md bg-card p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-heading font-bold">{signal.label}</span>
        <span className="text-ink">{signal.unit}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${LAYOUT.width} ${LAYOUT.height}`}
        role="img"
        aria-label={describe(signal)}
        className="mt-2 h-auto w-full"
      >
        {chart.band && (
          <rect
            x={LAYOUT.padX}
            width={LAYOUT.width - LAYOUT.padX * 2}
            y={chart.band.y}
            height={chart.band.height}
            className="fill-accent-soft"
          />
        )}
        <line
          x1={chart.baselineCutX}
          x2={chart.baselineCutX}
          y1={LAYOUT.padY}
          y2={LAYOUT.height - LAYOUT.padY}
          strokeDasharray="3 3"
          className="stroke-ink"
        />
        {chart.segments.map((d) => (
          <path key={d} d={d} fill="none" strokeWidth={1.5} className="stroke-signal" />
        ))}
        {chart.dots.map((dot) => (
          <circle
            key={dot.index}
            cx={dot.x}
            cy={dot.y}
            r={dot === lastDot ? 4 : 2.5}
            className={dot.index > signal.baselineEndIndex ? "fill-foreground" : "fill-signal"}
          />
        ))}
        {chart.gaps.map((gap) => (
          <g key={gap.index}>
            <line
              x1={gap.x}
              x2={gap.x}
              y1={LAYOUT.height - LAYOUT.padY - 8}
              y2={LAYOUT.height - LAYOUT.padY}
              strokeWidth={1.5}
              className="stroke-warn"
            />
          </g>
        ))}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink">
        <li>Puntos azules: baseline</li>
        <li>Puntos blancos: después del baseline</li>
        {baselineBand && <li>Banda: baseline ± 2 desviaciones</li>}
        {chart.gaps.length > 0 && <li>Marca amarilla: sin dato (no es cero)</li>}
      </ul>
    </figure>
  );
}
