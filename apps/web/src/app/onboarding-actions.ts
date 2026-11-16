"use server";

import { z } from "zod";

import { claimRole } from "@/features/roles/roles.session";
import { ROLES, type Role } from "@/features/roles/roles.types";
import { err, type Result } from "@/shared/result";

const inputSchema = z.object({ role: z.enum(ROLES) });

export async function claimRoleAction(raw: unknown): Promise<Result<Role>> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return err("Invalid role.");
  return claimRole(parsed.data.role);
}
