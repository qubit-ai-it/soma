import { err, ok, type Result } from "../../shared/result.ts";
import {
  ROLES,
  type AccessContext,
  type DemoActor,
  type F3Notification,
  type Level,
  type OperationalAvailability,
  type OperationalSummary,
  type Resource,
  type Role,
} from "./roles.types.ts";

export const ROLE_LABELS: Record<Role, string> = {
  astronaut: "Astronaut",
  cmo: "Onboard physician",
  commander: "Commander",
  earth: "Earth supervisor",
};

// Fictional identities used when nobody is signed in
export const DEMO_ACTORS: Record<Role, DemoActor> = {
  astronaut: { id: "demo-astronaut-01", label: "Astronaut", memberId: "cm-02" },
  cmo: { id: "demo-cmo-01", label: "Onboard physician" },
  commander: { id: "demo-commander-01", label: "Commander" },
  earth: { id: "demo-earth-md-01", label: "Earth physician" },
};

const STATIC_ACCESS: Record<Exclude<Resource, "clinical_detail">, readonly Role[]> = {
  operational_summary: ["cmo", "commander"],
  f3_notification: ["astronaut", "cmo", "commander", "earth"],
  alert_list: ["astronaut", "cmo", "commander", "earth"],
  alert_acknowledge: ["cmo", "commander", "earth"],
  alert_close: ["cmo", "commander", "earth"],
  audit_log: ["cmo", "commander", "earth"],
  earth_console: ["earth"],
  plan_review: ["earth"],
  plan_board_review: ["cmo"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function roleFromMetadata(metadata: unknown): Role | null {
  if (typeof metadata !== "object" || metadata === null) return null;
  const role = (metadata as { role?: unknown }).role;
  return isRole(role) ? role : null;
}

export function actorIdForUser(userId: string): string {
  const slug = userId.replace(/^user_/, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `user-${slug}`.slice(0, 64);
}

// Clinical detail (any level, F3 included) stays with the CMO and the person concerned
export function canAccess(role: Role, resource: Resource, context: AccessContext = {}): boolean {
  if (resource === "clinical_detail") {
    if (role === "cmo") return true;
    if (role === "astronaut") return context.ownData === true;
    return false;
  }
  return STATIC_ACCESS[resource].includes(role);
}

type F3Input = {
  level: Level;
  subjectId: string;
  action: string;
  issuedAt: string;
};

export function buildF3Notification(input: F3Input): Result<F3Notification> {
  if (input.level !== "F3") return err("F3 notifications are only built for level F3");
  const action = input.action.trim();
  const subjectRef = input.subjectId.trim();
  if (!action) return err("An F3 notification needs an action");
  if (!subjectRef) return err("An F3 notification needs a subject reference");
  return ok({ status: "F3", action, subjectRef, issuedAt: input.issuedAt });
}

const AVAILABILITY: Record<Level, OperationalAvailability> = {
  F0: "available",
  F1: "available",
  F2: "limited",
  F3: "unavailable",
  NOT_EVALUABLE: "unknown",
};

export function buildOperationalSummary(
  members: readonly { memberId: string; level: Level }[],
): OperationalSummary {
  const availability: Record<OperationalAvailability, number> = {
    available: 0,
    limited: 0,
    unavailable: 0,
    unknown: 0,
  };
  const mapped = members.map(({ memberId, level }) => {
    const value = AVAILABILITY[level];
    availability[value] += 1;
    return { memberId, availability: value };
  });
  return { total: mapped.length, availability, members: mapped };
}
