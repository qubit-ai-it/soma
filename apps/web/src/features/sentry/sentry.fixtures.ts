import type { Observation } from "../observation/observation.types.ts";
import { syntheticHeartRate, type Profile, type ProfileSource } from "./sentry.simulation.ts";

export const CALM = "cm-1a2b3c01";
export const MODERATE = "cm-1a2b3c02";
export const SPIKE = "cm-1a2b3c03";
export const QUIET = "cm-1a2b3c04";

export const FIXTURE_PROFILES: Record<string, Profile> = {
  [CALM]: { base: 66 },
  [MODERATE]: { base: 72, episode: { from: 36, to: 60, delta: 4 } },
  [SPIKE]: { base: 68, episode: { from: 90, to: 96, delta: 18 } },
  [QUIET]: { base: 60 },
};

export const FIXTURE_MEMBERS: ProfileSource[] = Object.keys(FIXTURE_PROFILES).map((id) => ({
  id,
  vitals: { heartRateBpm: FIXTURE_PROFILES[id].base },
}));

export function fixtureHeartRate(subjectId: string, start: number, t0: number): Observation {
  return syntheticHeartRate(subjectId, start, t0, FIXTURE_PROFILES[subjectId]);
}
