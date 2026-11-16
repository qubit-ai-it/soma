"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { MetricCard } from "@/shared/ui/metric-card";
import type { CardAction } from "@/shared/ui/soma-card";

import { describeLive } from "../live.display";
import { evaluateLive, type Bin } from "../live.logic";
import { useLiveState } from "../live.store";

type Escalate = (input: unknown) => Promise<{ ok: boolean; message: string }>;

const SPARK = { width: 240, height: 48 };

function Spark({ bins }: { bins: readonly Bin[] }) {
  const recent = bins.slice(-24);
  if (recent.length < 2) return null;
  const values = recent.map((b) => b.bpm);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const points = recent
    .map((b, i) => {
      const x = (i / (recent.length - 1)) * SPARK.width;
      const y = SPARK.height - ((b.bpm - min) / span) * (SPARK.height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      role="img"
      aria-label={`Últimas ${recent.length} lecturas: entre ${Math.round(min)} y ${Math.round(max)} lpm`}
      viewBox={`0 0 ${SPARK.width} ${SPARK.height}`}
      className="h-12 w-full text-signal"
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function LiveReading({ escalate }: { escalate: Escalate }) {
  const live = useLiveState();
  const [now, setNow] = useState(0);
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const evaluated = useMemo(
    () => evaluateLive(live.readings, live.deviceName ?? "Dispositivo", now),
    [live.readings, live.deviceName, now],
  );
  const view = describeLive(evaluated, live.status === "connected");
  const status = evaluated.evaluation?.status;

  const actions: CardAction[] =
    status === "F3" && evaluated.latestBpm !== null
      ? [
          {
            label: "Escalar a Tierra",
            icon: "emergency",
            disabled: pending,
            onClick: () =>
              start(async () => {
                const result = await escalate({ bpm: evaluated.latestBpm });
                setNotice(result.message);
              }),
          },
        ]
      : [];

  return (
    <MetricCard
      title="Frecuencia cardíaca en vivo"
      value={evaluated.latestBpm === null ? "— lpm" : `${Math.round(evaluated.latestBpm)} lpm`}
      line={view.line}
      icon="cardiology"
      source={live.deviceName ?? "Reloj o banda"}
      tone={view.tone}
      actions={actions}
    >
      <Spark bins={evaluated.bins} />
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
    </MetricCard>
  );
}
