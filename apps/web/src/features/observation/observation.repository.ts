import type { Observation } from "./observation.types.ts";

export type ObservationsRepository = {
  add(observation: Observation): Promise<{ observation: Observation; duplicate: boolean }>;
  listBySubject(
    subjectId: string,
    options?: { signal?: string; since?: string; limit?: number },
  ): Promise<Observation[]>;
};
