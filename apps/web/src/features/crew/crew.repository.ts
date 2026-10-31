import type { CrewMember } from "./crew.types.ts";

export interface CrewRepository {
  list(): Promise<CrewMember[]>;
  get(id: string): Promise<CrewMember | null>;
}
