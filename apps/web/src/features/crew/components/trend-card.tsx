import { useId } from "react";

import { Icon } from "@/shared/ui/icon";

import {
  areaPath,
  chartDomain,
  linePath,
  rangeStatus,
  referenceBand,
  scaleSeries,
  type ChartBox,
  type ChartRange,
} from "../crew.chart";
import type { Trend } from "../crew.types";

const BOX: ChartBox = { width: 240, height: 96, padX: 10, padY: 12 };

const TREND_META: Record<Trend, { symbol: string; label: string }> = {
  rising: { symbol: "trending_up", label: "Rising" },
  falling: { symbol: "trending_down", label: "Falling" },
  stable: { symbol: "trending_flat", label: "Stable" },
  insufficient: { symbol: "remove", label: "Not enough data" },
};

const day = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: "UTC" });

type Props = {
  title: string;
  unit: string;
  icon: string;
  /** Oldest first. */
  samples: readonly { at: string; value: number }[];
  /** Reference range drawn behind the readings; an open end runs to the edge. */
  range?: ChartRange;
  trend: Trend;
  digits?: number;
};

export function TrendCard({ title, unit, icon, samples, range = {}, trend, digits = 0 }: Props) {
  const gradient = useId();
  const values = samples.map((sample) => sample.value);
  const latest = values.at(-1);
  const domain = chartDomain(values, range);
  const points = scaleSeries(values, domain, BOX);
  const band = referenceBand(range, domain, BOX);
  const status = latest === undefined ? "normal" : rangeStatus(latest, range);
  const tone = status === "normal" ? "text-signal" : "text-warn";
  const last = points.at(-1);
  const meta = TREND_META[trend];

  return (
    <article
      aria-label={title}
      className="flex flex-col gap-4 rounded-[2rem_1.5rem_2.25rem_1.75rem] bg-card p-6"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base text-muted-foreground">{title}</h3>
          <p className="mt-1 font-heading text-4xl font-bold leading-tight">
            {latest === undefined ? "—" : latest.toFixed(digits)}
            <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
          <Icon name={meta.symbol} />
          {meta.label}
        </span>
      </header>

      {points.length > 1 ? (
        <svg
          role="img"
          aria-label={`${title}: from ${values[0].toFixed(digits)} to ${latest?.toFixed(digits)} ${unit} over ${values.length} records`}
          viewBox={`0 0 ${BOX.width} ${BOX.height}`}
          className={`h-24 w-full ${tone}`}
        >
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {band && (
            <rect
              x={0}
              y={band.y}
              width={BOX.width}
              height={band.height}
              rx={6}
              className="fill-foreground/[0.06]"
            />
          )}
          <path d={areaPath(points, BOX)} fill={`url(#${gradient})`} />
          <path
            d={linePath(points)}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point, index) => (
            <circle
              key={samples[index].at}
              cx={point.x}
              cy={point.y}
              r={index === points.length - 1 ? 4.5 : 2.5}
              fill={index === points.length - 1 ? "currentColor" : "var(--card)"}
              stroke="currentColor"
              strokeWidth={2}
            />
          ))}
          {last && <circle cx={last.x} cy={last.y} r={9} fill="currentColor" opacity={0.18} />}
        </svg>
      ) : (
        <p className="py-6 text-sm text-ink">Not enough records yet.</p>
      )}

      <footer className="flex items-center justify-between gap-3">
        <span className="text-xs text-ink">
          {samples.length > 0 && `${day.format(new Date(samples[0].at))} – ${day.format(new Date(samples[samples.length - 1].at))}`}
        </span>
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground text-background">
          <Icon name={icon} className="-rotate-[10deg] text-[1.5em]" />
        </span>
      </footer>
    </article>
  );
}
