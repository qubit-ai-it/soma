import type { Role } from "./roles.types.ts";

export type HomeKind = "self" | "review" | "operational" | "earth";

type Attention = "nominal" | "watch" | "review";

const HOME_BY_ROLE: Record<Role, HomeKind> = {
  astronaut: "self",
  cmo: "review",
  commander: "operational",
  earth: "earth",
};

const ATTENTION_RANK: Record<Attention, number> = { review: 0, watch: 1, nominal: 2 };

export function homeKind(role: Role): HomeKind {
  return HOME_BY_ROLE[role];
}

export function selectHomeCrew<T extends { id: string; attention: Attention }>(
  role: Role,
  crew: readonly T[],
  ownMemberId: string,
): T[] {
  switch (homeKind(role)) {
    case "self":
      return crew.filter((member) => member.id === ownMemberId);
    case "review":
      return crew
        .map((member, index) => ({ member, index }))
        .sort(
          (a, b) =>
            ATTENTION_RANK[a.member.attention] - ATTENTION_RANK[b.member.attention] ||
            a.index - b.index,
        )
        .map(({ member }) => member);
    default:
      return [];
  }
}
