import { fullName, generateCrewVitals, pickTitle } from "./crew.generate.ts";
import { memberIdForUser } from "./crew.member-id.ts";
import type { CrewRepository, NewCrewMember } from "./crew.repository.ts";
import type { CrewMember } from "./crew.types.ts";

export function createMemoryCrewRepository(now: () => Date = () => new Date()): CrewRepository {
  const byUser = new Map<string, CrewMember>();

  return {
    list: async () => [...byUser.values()],
    get: async (id) => [...byUser.values()].find((member) => member.id === id) ?? null,
    getByUser: async (userId) => byUser.get(userId) ?? null,
    ensure: async (input: NewCrewMember) => {
      const existing = byUser.get(input.userId);
      if (existing) return existing;
      const generated = generateCrewVitals(input.userId, input.role, now());
      const member: CrewMember = {
        id: memberIdForUser(input.userId),
        name: fullName(input.firstName, input.lastName),
        role: pickTitle(input.userId, input.role),
        vitals: generated.vitals,
        history: generated.history,
        cumulativeDoseMsv: generated.cumulativeDoseMsv,
        lastCheckIn: generated.lastCheckIn,
      };
      byUser.set(input.userId, member);
      return member;
    },
  };
}
