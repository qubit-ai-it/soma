import { BIN_MS, PLAUSIBLE_BPM } from "../live/live.logic.ts";
import { observationSchema } from "../observation/observation.schema.ts";
import type { Observation } from "../observation/observation.types.ts";
import type { IngestBody } from "./ingest.schema.ts";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function blockStart(at: number): number {
  return Math.floor(at / BIN_MS) * BIN_MS;
}

export function toBlockObservations(body: IngestBody, nowMs: number): Observation[] {
  const blocks = new Map<number, number[]>();
  for (const reading of body.readings) {
    const start = blockStart(reading.at);
    if (start + BIN_MS > nowMs) continue;
    const group = blocks.get(start);
    if (group) group.push(reading.bpm);
    else blocks.set(start, [reading.bpm]);
  }
  return [...blocks]
    .sort((a, b) => a[0] - b[0])
    .map(([start, values]) => {
      const bpm = median(values);
      const plausible = bpm >= PLAUSIBLE_BPM.min && bpm <= PLAUSIBLE_BPM.max;
      return observationSchema.parse({
        id: `hr-${body.subjectId}-${start}`,
        subjectId: body.subjectId,
        signal: "heartRate",
        value: bpm,
        unit: "bpm",
        observedAt: new Date(start + BIN_MS).toISOString(),
        provenance: { type: "real", source: "Web Bluetooth", device: body.device },
        quality: plausible ? { state: "valid" } : { state: "invalid", reason: "out-of-range" },
      });
    });
}
