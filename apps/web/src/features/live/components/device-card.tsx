"use client";

import { MetricCard } from "@/shared/ui/metric-card";
import type { CardAction } from "@/shared/ui/soma-card";

import { BLUETOOTH_MESSAGES } from "../live.display";
import { connectLive, disconnectLive, useLiveState } from "../live.store";

export function DeviceCard() {
  const live = useLiveState();
  const connected = live.status === "connected";

  const line = connected
    ? "Conectado"
    : live.status === "connecting"
      ? "Conectando…"
      : live.error
        ? BLUETOOTH_MESSAGES[live.error]
        : "Reloj o banda por Bluetooth.";

  const actions: CardAction[] = connected
    ? [{ label: "Desconectar", variant: "secondary", onClick: disconnectLive }]
    : [{ label: "Conectar", icon: "bluetooth", disabled: live.status === "connecting", onClick: () => void connectLive() }];

  return (
    <MetricCard
      title="Reloj o banda"
      value={live.deviceName ?? "Sin dispositivo"}
      line={line}
      icon="watch"
      tone={connected ? "ok" : "neutral"}
      actions={actions}
    />
  );
}
