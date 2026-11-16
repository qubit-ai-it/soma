import { err, ok, type Result } from "../../shared/result.ts";
import { canAccess } from "../roles/roles.logic.ts";
import type { Level, Role } from "../roles/roles.types.ts";
import type { Alert, AlertLevel } from "./alerts.types.ts";

type Escalation = {
  createsAlert: boolean;
  recipients: Role[];
  notifiesEarth: boolean;
};

const ESCALATION: Record<Level, Escalation> = {
  F0: { createsAlert: false, recipients: [], notifiesEarth: false },
  F1: { createsAlert: false, recipients: [], notifiesEarth: false },
  F2: { createsAlert: true, recipients: ["astronaut", "cmo"], notifiesEarth: false },
  F3: {
    createsAlert: true,
    recipients: ["astronaut", "cmo", "commander", "earth"],
    notifiesEarth: true,
  },
  NOT_EVALUABLE: { createsAlert: true, recipients: ["cmo"], notifiesEarth: false },
};

export function escalationFor(level: Level): Escalation {
  const rule = ESCALATION[level];
  return { ...rule, recipients: [...rule.recipients] };
}

const ACTOR_ID = /^[a-z0-9][a-z0-9-]{2,63}$/;
const NON_HUMAN_PREFIXES = ["system", "soma", "sentry", "ai-", "bot", "auto", "simulated", "deterministic"];

export function isIdentifiedHuman(actorId: string): boolean {
  const id = actorId.trim();
  if (!ACTOR_ID.test(id)) return false;
  return !NON_HUMAN_PREFIXES.some((prefix) => id.startsWith(prefix));
}

type BuildInput = {
  id: string;
  memberId: string;
  memberLabel: string;
  level: Level;
  title: string;
  action: string;
  clinicalDetail?: string;
  now: string;
};

export function buildAlert(input: BuildInput): Result<Alert> {
  const rule = ESCALATION[input.level];
  if (!rule.createsAlert) return err(`Level ${input.level} does not raise an alert`);
  const title = input.title.trim();
  const action = input.action.trim();
  if (!title || !action) return err("An alert needs a title and an action");
  return ok({
    id: input.id,
    memberId: input.memberId,
    memberLabel: input.memberLabel,
    level: input.level as AlertLevel,
    title,
    action,
    recipients: [...rule.recipients],
    ...(input.clinicalDetail ? { clinicalDetail: input.clinicalDetail } : {}),
    status: "open",
    createdAt: input.now,
    source: "deterministic-engine",
  });
}

type Actor = { actorId: string; role: Role; now: string };

function checkActor(actor: Actor, resource: "alert_acknowledge" | "alert_close"): string | null {
  if (!isIdentifiedHuman(actor.actorId)) return "An identified human is required";
  if (!canAccess(actor.role, resource)) return "This role cannot perform the action";
  return null;
}

export function acknowledgeAlert(alert: Alert, actor: Actor): Result<Alert> {
  const problem = checkActor(actor, "alert_acknowledge");
  if (problem) return err(problem);
  if (alert.status !== "open") return err("Only open alerts can be acknowledged");
  return ok({
    ...alert,
    status: "acknowledged",
    acknowledged: { actorId: actor.actorId.trim(), role: actor.role, at: actor.now },
  });
}

export function closeAlert(alert: Alert, actor: Actor & { note: string }): Result<Alert> {
  const problem = checkActor(actor, "alert_close");
  if (problem) return err(problem);
  if (alert.status !== "acknowledged") return err("Only acknowledged alerts can be closed");
  const note = actor.note.trim();
  if (!note) return err("Closing an alert needs a note");
  return ok({
    ...alert,
    status: "closed",
    closed: { actorId: actor.actorId.trim(), role: actor.role, at: actor.now, note },
  });
}

type Viewer = { role: Role; memberId?: string };

// The astronaut only sees alerts about themself; every other role sees what was addressed to it
export function alertsVisibleTo(alerts: readonly Alert[], viewer: Viewer): Alert[] {
  return alerts.filter((alert) => {
    if (!alert.recipients.includes(viewer.role)) return false;
    if (viewer.role === "astronaut") return viewer.memberId === alert.memberId;
    return true;
  });
}

export function projectAlert(alert: Alert, viewer: Viewer): Alert {
  const allowed = canAccess(viewer.role, "clinical_detail", {
    level: alert.level,
    ownData: viewer.memberId !== undefined && viewer.memberId === alert.memberId,
  });
  if (allowed) return alert;
  const { clinicalDetail: _omitted, ...rest } = alert;
  void _omitted;
  return rest;
}
