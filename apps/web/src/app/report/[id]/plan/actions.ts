"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { authorizeSession } from "@/features/alerts/alerts.authorize.session";
import { getEcosystem } from "@/features/earth/ecosystem.server";
import { ROLES } from "@/features/roles/roles.types";
import { getPlanFlow } from "@/server/plans.server";
import { err, ok, type Result } from "@/shared/result";

const planSchema = z.object({
  role: z.enum(ROLES),
  actorId: z.string().trim().min(1).max(64),
  planId: z.string().trim().min(1).max(80),
});

function refresh() {
  revalidatePath("/report/[id]/plan", "page");
  revalidatePath("/earth");
}

export async function submitPlanAction(raw: unknown): Promise<Result<void>> {
  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) return err("Invalid request.");
  const auth = await authorizeSession("plan_board_review");
  if (!auth.ok) return auth;

  const sent = await getPlanFlow().submit({
    planId: parsed.data.planId,
    actor: { role: "cmo", actorId: auth.value },
  });
  if (!sent.ok) return err(sent.error);
  await getEcosystem().earth.flush();
  refresh();
  return ok(undefined);
}

export async function approvePlanOnBoardAction(raw: unknown): Promise<Result<void>> {
  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) return err("Invalid request.");
  const auth = await authorizeSession("plan_board_review");
  if (!auth.ok) return auth;

  const approved = await getPlanFlow().approveBoard({
    planId: parsed.data.planId,
    actor: { role: "cmo", actorId: auth.value },
  });
  if (!approved.ok) return err(approved.error);
  refresh();
  return ok(undefined);
}
