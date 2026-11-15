import type { CardTone } from "../../shared/ui/soma-card.tsx";
import type { BluetoothError } from "./bluetooth.logic.ts";
import type { LiveEvaluation } from "./live.logic.ts";

export type LiveView = { chip: string; tone: CardTone; line: string };

export const BLUETOOTH_MESSAGES: Record<BluetoothError, string> = {
  unsupported: "Este navegador no permite Bluetooth.",
  cancelled: "Conexión cancelada.",
  error: "No se pudo conectar.",
};

const LEVEL_VIEW = {
  F0: { tone: "ok", line: "Dentro de tu referencia." },
  F1: { tone: "warn", line: "Por encima de tu referencia." },
  F2: { tone: "warn", line: "Se mantiene por encima." },
  F3: { tone: "danger", line: "Muy por encima de tu referencia." },
} as const;

export function describeLive(live: LiveEvaluation, connected: boolean): LiveView {
  if (live.phase === "waiting") {
    return connected
      ? { chip: "Esperando", tone: "info", line: "Esperando lecturas." }
      : { chip: "Sin conexión", tone: "neutral", line: "Conecta un reloj o una banda." };
  }
  if (live.phase === "calibrating" || live.evaluation === null) {
    return {
      chip: `Calibrando ${live.binsCount}/${live.calibrationBins}`,
      tone: "info",
      line: "Aprendiendo tu referencia.",
    };
  }

  const { status, limitations } = live.evaluation;
  if (status === "NOT_EVALUABLE") {
    const flat = limitations.some((l) => l.startsWith("zero-variability"));
    return {
      chip: "No evaluable",
      tone: "info",
      line: flat ? "Tu referencia no varía." : "Esperando nuevas lecturas.",
    };
  }
  return { chip: status, ...LEVEL_VIEW[status] };
}
