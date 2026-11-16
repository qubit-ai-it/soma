import type { CrewAppRole } from "./crew.generate.ts";
import type { CrewMember } from "./crew.types.ts";

export type NewCrewMember = {
  userId: string;
  firstName: string;
  lastName: string;
  role: CrewAppRole;
};

export interface CrewRepository {
  list(): Promise<CrewMember[]>;
  get(id: string): Promise<CrewMember | null>;
  getByUser(userId: string): Promise<CrewMember | null>;
  ensure(input: NewCrewMember): Promise<CrewMember>;
}
