import type { CrewMember, VitalSample } from "./crew.types.ts";

export type CrewAppRole = "astronaut" | "cmo" | "commander";

export type CrewProfile = {
  baselineHeartRateBpm: number;
  baselineSpo2Pct: number;
  baselineSleepHours: number;
  missionDay: number;
};

export const CREW_APP_ROLES: readonly CrewAppRole[] = ["astronaut", "cmo", "commander"];

const TITLES: Record<CrewAppRole, readonly string[]> = {
  astronaut: ["Flight Engineer", "Mission Specialist", "Pilot"],
  cmo: ["Flight Surgeon"],
  commander: ["Commander"],
};

const HEART_RATE_RANGE: Record<CrewAppRole, readonly [number, number]> = {
  astronaut: [54, 68],
  cmo: [58, 70],
  commander: [56, 70],
};

const DAILY_DOSE_MSV = [0.45, 0.65] as const;
const HISTORY_DAYS = 5;

export function isCrewAppRole(value: unknown): value is CrewAppRole {
  return typeof value === "string" && (CREW_APP_ROLES as readonly string[]).includes(value);
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rng(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (random: () => number, low: number, high: number) => low + random() * (high - low);
const round = (value: number, digits: number) => Number(value.toFixed(digits));

export function generateCrewVitals(
  seed: string,
  role: CrewAppRole,
  now: Date,
): Pick<CrewMember, "vitals" | "cumulativeDoseMsv" | "lastCheckIn"> & { history: VitalSample[]; profile: CrewProfile } {
  const random = rng(seed);
  const [hrLow, hrHigh] = HEART_RATE_RANGE[role];
  const profile: CrewProfile = {
    baselineHeartRateBpm: round(between(random, hrLow, hrHigh), 0),
    baselineSpo2Pct: round(between(random, 96.5, 98.5), 1),
    baselineSleepHours: round(between(random, 6.8, 7.8), 1),
    missionDay: Math.round(between(random, 20, 140)),
  };

  const sample = (at: Date, spread: number): VitalSample => ({
    at: at.toISOString(),
    heartRateBpm: round(profile.baselineHeartRateBpm + between(random, -spread, spread), 0),
    spo2Pct: round(Math.min(99.5, profile.baselineSpo2Pct + between(random, -0.6, 0.6)), 1),
    sleepHours: round(Math.max(6.2, profile.baselineSleepHours + between(random, -0.5, 0.5)), 1),
  });

  const history = Array.from({ length: HISTORY_DAYS }, (_, index) => {
    const daysAgo = HISTORY_DAYS - 1 - index;
    return sample(new Date(now.getTime() - daysAgo * 86_400_000), 4);
  });
  const latest = history[history.length - 1];

  return {
    profile,
    vitals: { heartRateBpm: latest.heartRateBpm, spo2Pct: latest.spo2Pct, sleepHours: latest.sleepHours },
    history,
    cumulativeDoseMsv: round(profile.missionDay * between(random, DAILY_DOSE_MSV[0], DAILY_DOSE_MSV[1]), 1),
    lastCheckIn: new Date(now.getTime() - Math.round(between(random, 10, 90)) * 60_000).toISOString(),
  };
}

export function pickTitle(seed: string, role: CrewAppRole): string {
  const titles = TITLES[role];
  return titles[Math.floor(rng(`${seed}:title`)() * titles.length)];
}

export function fullName(first: string, last: string): string {
  return [first, last].map((part) => part.trim()).filter(Boolean).join(" ");
}
