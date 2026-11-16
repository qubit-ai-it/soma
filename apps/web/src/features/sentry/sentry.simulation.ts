import { BIN_MS } from "../live/live.logic.ts";
import { observationSchema } from "../observation/observation.schema.ts";
import type { Observation } from "../observation/observation.types.ts";

export const SIM_SOURCE = "sentry-simulator";
export const SIM_CYCLE_BLOCKS = 240;
const MAX_CATCH_UP_BLOCKS = 60;
const START_LOOKBACK_MS = 35_000;

type Episode = { from: number; to: number; delta: number };
export type Profile = { base: number; episode?: Episode };
export type ProfileSource = { id: string; vitals?: { heartRateBpm: number }; history?: readonly { heartRateBpm: number }[] };

export const BACKFILL_STEP_MS = 15 * 60_000;
export const BACKFILL_POINTS = 96;
const BASE_BPM = { min: 50, max: 90 };
const FALLBACK_BASE_BPM = 68;

const NOISE = [0, 1, -1, 1, 0, -1, 0, 1, -1, 0];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function baselineBpm(source: ProfileSource): number {
  const samples = (source.history ?? []).map((s) => s.heartRateBpm);
  const raw = samples.length
    ? samples.reduce((sum, v) => sum + v, 0) / samples.length
    : (source.vitals?.heartRateBpm ?? FALLBACK_BASE_BPM);
  return Math.min(BASE_BPM.max, Math.max(BASE_BPM.min, Math.round(raw)));
}

export function profileFor(source: ProfileSource | string): Profile {
  const member = typeof source === "string" ? { id: source } : source;
  const base = baselineBpm(member);
  const h = hash(member.id);
  if (h % 3 !== 0) return { base };
  const from = 30 + ((h >>> 4) % 120);
  const length = 6 + ((h >>> 12) % 19);
  return { base, episode: { from, to: from + length, delta: 3 + ((h >>> 20) % 3) } };
}

function noise(subjectId: string, block: number): number {
  return NOISE[(block + (hash(subjectId) % NOISE.length)) % NOISE.length];
}

function observation(subjectId: string, start: number, bpm: number): Observation {
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

export function syntheticHeartRate(
  subjectId: string,
  start: number,
  t0: number,
  profile: Profile = profileFor(subjectId),
): Observation {
  const k = (((start - t0) / BIN_MS) % SIM_CYCLE_BLOCKS + SIM_CYCLE_BLOCKS) % SIM_CYCLE_BLOCKS;
  const inEpisode = profile.episode && k >= profile.episode.from && k < profile.episode.to;
  return observation(subjectId, start, profile.base + noise(subjectId, k) + (inEpisode ? profile.episode!.delta : 0));
}

export function backfillObservations(subjectId: string, profile: Profile, nowMs: number): Observation[] {
  const last = Math.floor((nowMs - BACKFILL_STEP_MS) / BIN_MS) * BIN_MS;
  return Array.from({ length: BACKFILL_POINTS }, (_, i) => {
    const start = last - (BACKFILL_POINTS - 1 - i) * BACKFILL_STEP_MS;
    return observation(subjectId, start, profile.base + noise(subjectId, i));
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
