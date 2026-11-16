import { Icon } from "@/shared/ui/icon";

import { rangeStatus } from "../crew.chart";
import { THRESHOLDS } from "../crew.logic";
import type { Trend } from "../crew.types";

const STATUS = {
  low: { label: "Baja", tone: "text-danger" },
  normal: { label: "En rango", tone: "text-ok" },
  high: { label: "En rango", tone: "text-ok" },
} as const;

const TREND: Record<Trend, string> = {
  rising: "Subiendo",
  falling: "Bajando",
  stable: "Estable",
  insufficient: "Pocos datos",
};

export function OxygenCard({ spo2, trend }: { spo2: number; trend: Trend }) {
  const status = STATUS[rangeStatus(spo2, { low: THRESHOLDS.minSpo2Pct })];
  return (
    <article
      aria-label="Saturación de oxígeno"
      className="flex flex-col justify-between gap-6 rounded-[2rem_1.5rem_2.25rem_1.75rem] bg-card p-6"
    >
      <div>
        <h3 className="text-base text-muted-foreground">Saturación de oxígeno</h3>
        <p className="mt-1 flex items-baseline gap-2 font-heading text-6xl font-bold leading-none">
          {spo2}
          <span className="text-lg font-normal text-muted-foreground">%</span>
        </p>
        <p className="mt-3 text-sm text-ink">
          <span className={`font-semibold ${status.tone}`}>{status.label}</span> · {TREND[trend]}
        </p>
        <p className="mt-3 text-xs font-semibold text-muted-foreground">Sensores de la misión</p>
      </div>

      <div className="flex justify-end">
        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-full bg-foreground text-background"
        >
          <Icon name="pulmonology" className="-rotate-[8deg] text-[2em]" />
        </span>
      </div>
    </article>
  );
}
