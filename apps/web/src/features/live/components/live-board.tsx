"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { SomaCard, type CardAction } from "@/shared/ui/soma-card";

import { BLUETOOTH_MESSAGES, describeLive } from "../live.display";
import { evaluateLive, type Bin } from "../live.logic";
import { connectLive, disconnectLive, useLiveState } from "../live.store";

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

export function LiveBoard({ escalate }: { escalate: Escalate }) {
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
  const connected = live.status === "connected";
  const view = describeLive(evaluated, connected);
  const status = evaluated.evaluation?.status;

  const deviceLine = connected
    ? "Conectado"
    : live.status === "connecting"
      ? "Conectando…"
      : live.error
        ? BLUETOOTH_MESSAGES[live.error]
        : "Reloj o banda por Bluetooth.";

  const deviceActions: CardAction[] = connected
    ? [{ label: "Desconectar", variant: "secondary", onClick: disconnectLive }]
    : [{ label: "Conectar", icon: "bluetooth", disabled: live.status === "connecting", onClick: () => void connectLive() }];

  const readingActions: CardAction[] =
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
    <section aria-label="Datos en vivo" className="grid gap-4 sm:grid-cols-2">
      <SomaCard
        title={live.deviceName ?? "Sin dispositivo"}
        line={deviceLine}
        chip={connected ? "Conectado" : "Sin conexión"}
        tone={connected ? "ok" : "neutral"}
        actions={deviceActions}
      />

      <SomaCard
        title={evaluated.latestBpm === null ? "— lpm" : `${Math.round(evaluated.latestBpm)} lpm`}
        line={view.line}
        chip={view.chip}
        tone={view.tone}
        actions={readingActions}
        detail={
          <>
            <p>
              La referencia se calcula con tus primeras {evaluated.calibrationBins} mediciones de 5 segundos.
            </p>
            {evaluated.evaluation?.triggeredRules.length ? (
              <p>Reglas activas: {evaluated.evaluation.triggeredRules.join(", ")}.</p>
            ) : null}
            <p>Estas lecturas son de tu dispositivo y no son un diagnóstico.</p>
          </>
        }
      >
        <Spark bins={evaluated.bins} />
        {notice && (
          <p role="status" className="text-sm">
            {notice}
          </p>
        )}
      </SomaCard>
    </section>
  );
}
