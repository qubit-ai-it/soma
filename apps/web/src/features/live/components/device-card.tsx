"use client";

import { MetricCard } from "@/shared/ui/metric-card";
import type { CardAction } from "@/shared/ui/soma-card";

import { BLUETOOTH_MESSAGES } from "../live.display";
import { connectLive, disconnectLive, useLiveState } from "../live.store";

export function DeviceCard() {
  const live = useLiveState();
  const connected = live.status === "connected";

  const line = connected
    ? "Connected"
    : live.status === "connecting"
      ? "Connecting…"
      : live.error
        ? BLUETOOTH_MESSAGES[live.error]
        : "Watch or band over Bluetooth.";

  const actions: CardAction[] = connected
    ? [{ label: "Disconnect", variant: "secondary", onClick: disconnectLive }]
    : [{ label: "Connect", icon: "bluetooth", disabled: live.status === "connecting", onClick: () => void connectLive() }];

  return (
    <MetricCard
      title="Watch or band"
      value={live.deviceName ?? "No device"}
      line={line}
      icon="watch"
      tone={connected ? "ok" : "neutral"}
      actions={actions}
    />
  );
}
