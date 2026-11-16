import type { Status } from "../rules/rules.types.ts";
import type { LimitationView } from "./evaluation.types.ts";

export const SIGNAL_LABEL: Record<string, string> = {
  sleepHours: "Sleep",
  hrv: "Heart rate variability (HRV)",
  heartRate: "Heart rate",
  fatigue: "Self-reported fatigue",
};

export const RULE_LABEL: Record<string, string> = {
  "sleep-low": "Sleep below its baseline",
  "hrv-low": "HRV below its baseline",
  "hrv-low-persistent": "HRV persistently low",
  "fatigue-high": "Fatigue above its baseline",
  "heart-rate-high": "Heart rate above its baseline",
  "heart-rate-critical": "Heart rate in critical range",
  "conv-3": "Three or more signals deviating at once",
  "hr-high": "Heart rate above its baseline",
  "hr-high-persistent": "Heart rate persistently high",
  "hr-critical": "Heart rate in critical range",
};

export const STATUS_COPY: Record<Status, { name: string; summary: string }> = {
  F0: { name: "F0", summary: "Everything within the usual range" },
  F1: { name: "F1", summary: "Mild deviation" },
  F2: { name: "F2", summary: "Persistent deviation" },
  F3: { name: "F3", summary: "Critical rule triggered" },
  NOT_EVALUABLE: { name: "NOT EVALUABLE", summary: "Not enough data to evaluate" },
};

export const NOT_EVALUABLE_MESSAGE =
  "NOT EVALUABLE is not F0: without data there is no evaluation.";

export const SCENARIO_COPY: Record<string, { title: string; description: string }> = {
  "fatigue-sleep-hrv": {
    title: "Reduced sleep, falling HRV and fatigue",
    description:
      "Short sleep, falling HRV. Ends at F2.",
  },
  "critical-f3": {
    title: "Heart rate spike",
    description:
      "Abrupt jump in one signal. Ends at F3.",
  },
  "insufficient-data": {
    title: "HRV sensor without data",
    description:
      "No HRV data. Ends at NOT EVALUABLE.",
  },
};

export const PROVENANCE_LABEL: Record<string, string> = {
  real: "Real",
  historical: "Historical",
  synthetic: "Synthetic",
};

export const QUALITY_LABEL: Record<string, string> = {
  valid: "Valid",
  suspect: "Doubtful",
  invalid: "Invalid",
  missing: "No data",
};

export function formatNumber(value: number, digits = 1): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export function signalLabel(signal: string): string {
  return SIGNAL_LABEL[signal] ?? signal;
}

export function translateLimitation(
  code: string,
  minBaselineObservations: number,
): LimitationView {
  const [kind, signal, reason] = code.split(":");
  const name = signal ? signalLabel(signal) : "";

  if (kind === "insufficient-baseline" && signal) {
    const text =
      reason === "mixed-units"
        ? `${name}: the baseline mixes different units and is not comparable.`
        : `${name}: the baseline has fewer than ${minBaselineObservations} valid observations.`;
    return { code, signal, text };
  }
  if (kind === "zero-variability" && signal) {
    return {
      code,
      signal,
      text: `${name}: the baseline has no variability, so the deviation cannot be normalized.`,
    };
  }
  if (kind === "stale-data" && signal) {
    return { code, signal, text: `${name}: no recent data.` };
  }
  if (kind === "no-recent-observations" && signal) {
    return {
      code,
      signal,
      text: `${name}: no valid observations after the baseline.`,
    };
  }
  return { code, signal: signal ?? null, text: `Unrecognized limitation (${code}).` };
}
