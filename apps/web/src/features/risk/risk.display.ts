import type { RiskLevel } from "./classifier.port.ts";

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  low: "Bajo",
  moderate: "Moderado",
  high: "Alto",
};

export function describeSource(source: {
  provider: string;
  mode: string;
  calibrated: boolean;
}): { badge: string | null; detail: string } {
  const detail = `${source.provider} · ${source.mode}`;
  if (source.mode === "mock") return { badge: null, detail };
  if (source.provider === "laya" && !source.calibrated) {
    return { badge: "local fallback · uncalibrated", detail };
  }
  return { badge: null, detail };
}
