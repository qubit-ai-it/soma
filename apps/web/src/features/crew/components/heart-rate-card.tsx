import type { CSSProperties } from "react";

import { Icon } from "@/shared/ui/icon";

import { rangeStatus } from "../crew.chart";
import { beatDuration, RESTING_HEART_RATE } from "../crew.logic";
import type { Trend } from "../crew.types";

const STATUS = {
  low: { label: "Baja", tone: "text-warn" },
  normal: { label: "En rango", tone: "text-ok" },
  high: { label: "Alta", tone: "text-danger" },
} as const;

const TREND: Record<Trend, string> = {
  rising: "Subiendo",
  falling: "Bajando",
  stable: "Estable",
  insufficient: "Pocos datos",
};

export function HeartRateCard({ bpm, trend }: { bpm: number; trend: Trend }) {
  const status = STATUS[rangeStatus(bpm, RESTING_HEART_RATE)];
  return (
    <article
      aria-label="Frecuencia cardíaca"
      className="flex flex-col justify-between gap-6 rounded-[2rem_1.5rem_2.25rem_1.75rem] bg-card p-6"
    >
      <div>
        <h3 className="text-base text-muted-foreground">Frecuencia cardíaca</h3>
        <p className="mt-1 flex items-baseline gap-2 font-heading text-6xl font-bold leading-none">
          {bpm}
          <span className="text-lg font-normal text-muted-foreground">lpm</span>
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
          <Icon
            name="favorite"
            className="animate-heartbeat -rotate-[8deg] text-[2em]"
            style={{ "--heartbeat-duration": beatDuration(bpm) } as CSSProperties}
          />
        </span>
      </div>
    </article>
  );
}
