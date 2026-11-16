"use server";

import { z } from "zod";

import { claimRole, type Account } from "@/features/roles/roles.session";
import { ROLES } from "@/features/roles/roles.types";
import { err, type Result } from "@/shared/result";

const inputSchema = z.object({ role: z.enum(ROLES) });

export async function claimRoleAction(raw: unknown): Promise<Result<Account>> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return err("Invalid role.");
  return claimRole(parsed.data.role);
}
