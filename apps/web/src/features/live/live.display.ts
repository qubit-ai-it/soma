import type { CardTone } from "../../shared/ui/soma-card.tsx";
import type { BluetoothError } from "./bluetooth.logic.ts";
import type { LiveEvaluation } from "./live.logic.ts";

export type LiveView = { chip: string; tone: CardTone; line: string };

export const BLUETOOTH_MESSAGES: Record<BluetoothError, string> = {
  unsupported: "This browser does not support Bluetooth.",
  cancelled: "Connection cancelled.",
  error: "Could not connect.",
};

const LEVEL_VIEW = {
  F0: { tone: "ok", line: "Within your baseline." },
  F1: { tone: "warn", line: "Above your baseline." },
  F2: { tone: "warn", line: "Remains above your baseline." },
  F3: { tone: "danger", line: "Well above your baseline." },
} as const;

export function describeLive(live: LiveEvaluation, connected: boolean): LiveView {
  if (live.phase === "waiting") {
    return connected
      ? { chip: "Waiting", tone: "info", line: "Waiting for readings." }
      : { chip: "Disconnected", tone: "neutral", line: "Connect a watch or band." };
  }
  if (live.phase === "calibrating" || live.evaluation === null) {
    return {
      chip: `Calibrating ${live.binsCount}/${live.calibrationBins}`,
      tone: "info",
      line: "Learning your baseline.",
    };
  }

  const { status, limitations } = live.evaluation;
  if (status === "NOT_EVALUABLE") {
    const flat = limitations.some((l) => l.startsWith("zero-variability"));
    return {
      chip: "Not evaluable",
      tone: "info",
      line: flat ? "Your baseline does not vary." : "Waiting for new readings.",
    };
  }
  return { chip: status, ...LEVEL_VIEW[status] };
}
