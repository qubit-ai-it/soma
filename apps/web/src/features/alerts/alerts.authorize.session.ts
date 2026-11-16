import "server-only";

import { getSessionCaller } from "../roles/roles.session.ts";
import { canAccess } from "../roles/roles.logic.ts";
import type { Resource } from "../roles/roles.types.ts";
import { err, ok, type Result } from "../../shared/result.ts";
import { isIdentifiedHuman } from "./alerts.logic.ts";

export async function authorizeSession(resource: Resource): Promise<Result<string>> {
  const caller = await getSessionCaller();
  if (!caller) return err("Sign in to perform this action.");
  if (!canAccess(caller.role, resource)) return err("Your role is not allowed to perform this action.");
  if (!isIdentifiedHuman(caller.actorId)) return err("An identified person is required.");
  return ok(caller.actorId);
}
