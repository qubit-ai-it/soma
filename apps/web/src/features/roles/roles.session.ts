import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";

import { err, ok, type Result } from "../../shared/result.ts";
import { actorIdForUser, roleFromMetadata } from "./roles.logic.ts";
import type { Role } from "./roles.types.ts";

export type SessionCaller = { role: Role; actorId: string };

export async function getSessionCaller(): Promise<SessionCaller | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = roleFromMetadata(user.publicMetadata);
  return role ? { role, actorId: actorIdForUser(userId) } : null;
}

export async function claimRole(chosen: Role): Promise<Result<Role>> {
  const { userId } = await auth();
  if (!userId) return err("Sign in to join the crew.");
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const existing = roleFromMetadata(user.publicMetadata);
  if (existing) return ok(existing);
  await client.users.updateUserMetadata(userId, { publicMetadata: { role: chosen } });
  return ok(chosen);
}
