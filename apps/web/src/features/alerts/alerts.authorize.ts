import { err, ok, type Result } from "../../shared/result.ts";
import { DEMO_ACTORS, canAccess } from "../roles/roles.logic.ts";
import type { Resource, Role } from "../roles/roles.types.ts";
import { isIdentifiedHuman } from "./alerts.logic.ts";

// Demo-only: the caller declares a role and a named actor; there is no real authentication
export function authorizeCaller(
  caller: { role: Role; actorId: string },
  resource: Resource,
): Result<string> {
  if (!canAccess(caller.role, resource)) return err("El rol activo no tiene permiso para esta acción.");
  const actorId = caller.actorId.trim();
  if (!isIdentifiedHuman(actorId) || DEMO_ACTORS[caller.role].id !== actorId) {
    return err("Se requiere una persona identificada.");
  }
  return ok(actorId);
}
