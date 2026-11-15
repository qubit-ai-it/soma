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
  astronaut: "Astronauta",
  cmo: "Médico de a bordo",
  commander: "Comandante",
  earth: "Supervisor de Tierra",
};

// Fictional identities for the demo; there is no authentication
export const DEMO_ACTORS: Record<Role, DemoActor> = {
  astronaut: { id: "demo-astronaut-01", label: "Astronauta demo", memberId: "cm-02" },
  cmo: { id: "demo-cmo-01", label: "Médico de a bordo demo" },
  commander: { id: "demo-commander-01", label: "Comandante demo" },
  earth: { id: "demo-earth-md-01", label: "Médico de Tierra demo" },
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
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
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
