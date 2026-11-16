import { BIN_MS } from "../live/live.logic.ts";
import { observationSchema } from "../observation/observation.schema.ts";
import type { Observation } from "../observation/observation.types.ts";

export const SIM_SOURCE = "sentry-simulator";
export const SIM_CYCLE_BLOCKS = 240;
const MAX_CATCH_UP_BLOCKS = 60;
const START_LOOKBACK_MS = 35_000;

type Episode = { from: number; to: number; delta: number };
type Profile = { base: number; episode?: Episode };

export const SIM_PROFILES: Record<string, Profile> = {
  "cm-01": { base: 66 },
  "cm-02": { base: 72, episode: { from: 36, to: 60, delta: 6 } },
  "cm-03": { base: 68, episode: { from: 90, to: 96, delta: 18 } },
  "cm-04": { base: 60 },
};

export const SIM_SUBJECTS = Object.keys(SIM_PROFILES);

const NOISE = [0, 1, -1, 1, 0, -1, 0, 1, -1, 0];

function noise(subjectId: string, block: number): number {
  return NOISE[(block + subjectId.length * 3 + Number(subjectId.slice(-1))) % NOISE.length];
}

export function syntheticHeartRate(subjectId: string, start: number, t0: number): Observation {
  const profile = SIM_PROFILES[subjectId];
  if (!profile) throw new Error(`No simulation profile for ${subjectId}`);
  const k = (((start - t0) / BIN_MS) % SIM_CYCLE_BLOCKS + SIM_CYCLE_BLOCKS) % SIM_CYCLE_BLOCKS;
  const inEpisode = profile.episode && k >= profile.episode.from && k < profile.episode.to;
  const bpm = profile.base + noise(subjectId, k) + (inEpisode ? profile.episode!.delta : 0);
  return observationSchema.parse({
    id: `hr-${subjectId}-${start}`,
    subjectId,
    signal: "heartRate",
    value: bpm,
    unit: "bpm",
    observedAt: new Date(start + BIN_MS).toISOString(),
    provenance: { type: "synthetic", source: SIM_SOURCE },
    quality: { state: "valid" },
  });
}

export function blockStartsToEmit(lastObservedAt: string | null, nowMs: number): number[] {
  const lastClosed = Math.floor(nowMs / BIN_MS) * BIN_MS - BIN_MS;
  const first =
    lastObservedAt === null
      ? Math.floor((nowMs - START_LOOKBACK_MS) / BIN_MS) * BIN_MS
      : Date.parse(lastObservedAt);
  const starts: number[] = [];
  for (let start = first; start <= lastClosed && starts.length < MAX_CATCH_UP_BLOCKS; start += BIN_MS) {
    starts.push(start);
  }
  return starts;
}
