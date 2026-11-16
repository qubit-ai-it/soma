import type { Observation } from "./observation.types.ts";

export type ObservationsRepository = {
  add(observation: Observation): Promise<{ observation: Observation; duplicate: boolean }>;
  addMany(observations: Observation[]): Promise<{ stored: number; duplicates: number }>;
  listBySubject(
    subjectId: string,
    options?: { signal?: string; since?: string; limit?: number; newest?: boolean },
  ): Promise<Observation[]>;
};
