import { observationSchema } from "../observation/observation.schema.ts";
import type { Observation } from "../observation/observation.types.ts";
import { evaluate } from "../rules/rules.engine.ts";
import { ruleSetSchema } from "../rules/rules.schema.ts";
import type { Evaluation } from "../rules/rules.types.ts";

export const BIN_MS = 5000;
export const LIVE_CALIBRATION_BINS = 6;
export const LIVE_SUBJECT = "live-astronaut";

const PLAUSIBLE_BPM = { min: 30, max: 220 };

export const LIVE_RULESET = ruleSetSchema.parse({
  version: "live-0.1.0",
  rules: [
    { id: "hr-high", signal: "heartRate", direction: "increase", minNormalizedDelta: 3, minConsecutive: 1, level: "F1" },
    { id: "hr-high-persistent", signal: "heartRate", direction: "increase", minNormalizedDelta: 3, minConsecutive: 3, level: "F2" },
    { id: "hr-critical", signal: "heartRate", direction: "increase", minNormalizedDelta: 8, minConsecutive: 1, level: "F3" },
  ],
});

export type Reading = { at: number; bpm: number };
export type Bin = { startMs: number; bpm: number };

export type LiveEvaluation = {
  phase: "waiting" | "calibrating" | "live";
  binsCount: number;
  calibrationBins: number;
  latestBpm: number | null;
  bins: Bin[];
  evaluation: Evaluation | null;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function binReadings(readings: readonly Reading[], nowMs: number, binMs = BIN_MS): Bin[] {
  if (readings.length === 0) return [];
  const sorted = [...readings].sort((a, b) => a.at - b.at);
  const start = sorted[0].at;
  const groups = new Map<number, number[]>();
  for (const reading of sorted) {
    const index = Math.floor((reading.at - start) / binMs);
    const group = groups.get(index);
    if (group) group.push(reading.bpm);
    else groups.set(index, [reading.bpm]);
  }
  return [...groups]
    .filter(([index]) => start + (index + 1) * binMs <= nowMs)
    .sort((a, b) => a[0] - b[0])
    .map(([index, values]) => ({ startMs: start + index * binMs, bpm: median(values) }));
}

function toObservations(bins: readonly Bin[], device: string): Observation[] {
  return bins.map((bin) => {
    const plausible = bin.bpm >= PLAUSIBLE_BPM.min && bin.bpm <= PLAUSIBLE_BPM.max;
    return observationSchema.parse({
      id: `live-hr-${bin.startMs}`,
      subjectId: LIVE_SUBJECT,
      signal: "heartRate",
      value: bin.bpm,
      unit: "bpm",
      observedAt: new Date(bin.startMs + BIN_MS).toISOString(),
      provenance: { type: "real", source: "Web Bluetooth", device },
      quality: plausible ? { state: "valid" } : { state: "invalid", reason: "out-of-range" },
    });
  });
}

export function evaluateLive(
  readings: readonly Reading[],
  device: string,
  nowMs: number,
): LiveEvaluation {
  const latestBpm =
    readings.length === 0
      ? null
      : readings.reduce((latest, r) => (r.at >= latest.at ? r : latest)).bpm;
  const bins = binReadings(readings, nowMs);
  const base = { binsCount: bins.length, calibrationBins: LIVE_CALIBRATION_BINS, latestBpm, bins };

  if (readings.length === 0) return { ...base, phase: "waiting", evaluation: null };
  if (bins.length < LIVE_CALIBRATION_BINS) return { ...base, phase: "calibrating", evaluation: null };

  const observations = toObservations(bins, device);
  const baselineUntil = new Date(
    Date.parse(observations[LIVE_CALIBRATION_BINS - 1].observedAt) + 1,
  ).toISOString();

  const evaluation = evaluate({
    subjectId: LIVE_SUBJECT,
    observations,
    ruleSet: LIVE_RULESET,
    minBaselineObservations: LIVE_CALIBRATION_BINS,
    baselineUntil,
    evaluatedAt: new Date(nowMs).toISOString(),
  });
  return { ...base, phase: "live", evaluation };
}
