import { err, ok, type Result } from "../../shared/result.ts";
import { DEMO_ACTORS, canAccess } from "../roles/roles.logic.ts";
import type { Resource, Role } from "../roles/roles.types.ts";
import { isIdentifiedHuman } from "./alerts.logic.ts";

// Demo-only: the caller declares a role and a named actor; there is no real authentication
export function authorizeCaller(
  caller: { role: Role; actorId: string },
  resource: Resource,
): Result<string> {
  if (!canAccess(caller.role, resource)) return err("The active role is not allowed to perform this action.");
  const actorId = caller.actorId.trim();
  if (!isIdentifiedHuman(actorId) || DEMO_ACTORS[caller.role].id !== actorId) {
    return err("An identified person is required.");
  }
  return ok(actorId);
}
