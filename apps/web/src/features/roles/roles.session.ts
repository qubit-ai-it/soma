import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";

import { isCrewAppRole } from "../crew/crew.generate.ts";
import { memberIdForUser } from "../crew/crew.member-id.ts";
import { getServices } from "../../server/services.ts";
import { err, ok, type Result } from "../../shared/result.ts";
import { actorIdForUser, memberIdFromMetadata, roleFromMetadata } from "./roles.logic.ts";
import type { Role } from "./roles.types.ts";

export type SessionCaller = { role: Role; actorId: string; memberId: string | null };

export async function getSessionCaller(): Promise<SessionCaller | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = roleFromMetadata(user.publicMetadata);
  if (!role) return null;
  const memberId = isCrewAppRole(role) ? (memberIdFromMetadata(user.publicMetadata) ?? memberIdForUser(userId)) : null;
  return { role, actorId: actorIdForUser(userId), memberId };
}

export type Account = { role: Role; memberId: string | null };

export async function claimRole(chosen: Role): Promise<Result<Account>> {
  const { userId } = await auth();
  if (!userId) return err("Sign in to join the crew.");
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = roleFromMetadata(user.publicMetadata) ?? chosen;
  let memberId = memberIdFromMetadata(user.publicMetadata);

  if (isCrewAppRole(role)) {
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    const fallback = user.username ?? email.split("@")[0] ?? "Crew";
    const member = await getServices().crew.ensure({
      userId,
      firstName: user.firstName?.trim() || fallback,
      lastName: user.lastName?.trim() ?? "",
      role,
    });
    memberId = member.id;
  }

  if (roleFromMetadata(user.publicMetadata) !== role || memberIdFromMetadata(user.publicMetadata) !== memberId) {
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role, ...(memberId ? { memberId } : {}) },
    });
  }
  return ok({ role, memberId });
}
