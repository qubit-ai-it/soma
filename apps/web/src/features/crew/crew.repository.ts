import type { CrewMember } from "./crew.types.ts";

/** Port: the rest of the app never knows whether JSON, SQLite or an API is behind it. */
export interface CrewRepository {
  list(): Promise<CrewMember[]>;
  get(id: string): Promise<CrewMember | null>;
}
