import type { Trend, VitalSample, VitalTrends } from "./crew.types.ts";

const MIN_SAMPLES = 3;

const TOLERANCE = { heartRate: 3, spo2: 1, sleep: 0.5 } as const;

export function computeTrend(values: readonly number[], tolerance: number): Trend {
  if (values.length < MIN_SAMPLES) return "insufficient";
  const delta = values[values.length - 1] - values[0];
  if (Math.abs(delta) <= tolerance) return "stable";
  return delta > 0 ? "rising" : "falling";
}

export function vitalTrends(history: readonly VitalSample[] | undefined): VitalTrends {
  const ordered = [...(history ?? [])].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at),
  );
  return {
    heartRate: computeTrend(ordered.map((s) => s.heartRateBpm), TOLERANCE.heartRate),
    spo2: computeTrend(ordered.map((s) => s.spo2Pct), TOLERANCE.spo2),
    sleep: computeTrend(ordered.map((s) => s.sleepHours), TOLERANCE.sleep),
  };
}
