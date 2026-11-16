"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { authorizeCaller as authorize } from "@/features/alerts/alerts.authorize";
import { linkPatchSchema, reviewInputSchema } from "@/features/earth/earth.schema";
import { getEcosystem } from "@/features/earth/ecosystem.server";
import { FOLLOWUP_DECISIONS } from "@/features/followup/followup.record";
import { EARTH_DECISIONS } from "@/features/plan/plan.record";
import { getFollowUpFlow } from "@/server/followup.server";
import { getPlanFlow } from "@/server/plans.server";
import { ROLES } from "@/features/roles/roles.types";
import { err, ok, type Result } from "@/shared/result";

const callerSchema = z.object({
  role: z.enum(ROLES),
  actorId: z.string().trim().min(1).max(64),
});

const linkSchema = callerSchema.extend({ patch: linkPatchSchema });
const flushSchema = callerSchema.extend({ force: z.boolean() });
const reviewSchema = callerSchema.extend({ review: reviewInputSchema });
const followUpReviewSchema = callerSchema.extend({
  followUpId: z.string().trim().min(1).max(80),
  windowId: z.string().trim().min(1).max(40),
  decision: z.enum(FOLLOWUP_DECISIONS),
  note: z.string().max(1000),
});
const planReviewSchema = callerSchema.extend({
  planId: z.string().trim().min(1).max(80),
  decision: z.enum(EARTH_DECISIONS),
  note: z.string().max(1000),
  steps: z.array(z.string().trim().min(1).max(300)).min(1).max(12).optional(),
});

function refresh() {
  revalidatePath("/earth");
}

export async function setLinkAction(raw: unknown): Promise<Result<void>> {
  const parsed = linkSchema.safeParse(raw);
  if (!parsed.success) return err("Invalid request.");
  const auth = authorize(parsed.data, "earth_console");
  if (!auth.ok) return auth;

  const { earth } = getEcosystem();
  await earth.setLink(parsed.data.patch);
  if (parsed.data.patch.status === "connected") await earth.flush({ force: true });
  refresh();
  return ok(undefined);
}

export async function flushQueueAction(raw: unknown): Promise<Result<void>> {
  const parsed = flushSchema.safeParse(raw);
  if (!parsed.success) return err("Invalid request.");
  const auth = authorize(parsed.data, "earth_console");
  if (!auth.ok) return auth;

  await getEcosystem().earth.flush({ force: parsed.data.force });
  refresh();
  return ok(undefined);
}

export async function reviewProposalAction(raw: unknown): Promise<Result<void>> {
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    return err("Check the fields: a modification or rejection needs a note, and a modification needs at least one step.");
  }
  const auth = authorize(parsed.data, "plan_review");
  if (!auth.ok) return auth;

  const { earth } = getEcosystem();
  const reviewed = await earth.review(parsed.data.review, auth.value);
  if (!reviewed.ok) return err("This proposal was already reviewed or does not exist.");
  await earth.flush();
  refresh();
  return ok(undefined);
}

export async function reviewPlanAction(raw: unknown): Promise<Result<void>> {
  const parsed = planReviewSchema.safeParse(raw);
  if (!parsed.success) return err("Check the plan fields.");
  const auth = authorize(parsed.data, "plan_review");
  if (!auth.ok) return auth;

  const sent = await getPlanFlow().earthRespond({
    planId: parsed.data.planId,
    decision: parsed.data.decision,
    note: parsed.data.note,
    steps: parsed.data.steps,
    reviewerId: auth.value,
  });
  if (!sent.ok) return err(sent.error);
  await getEcosystem().earth.flush();
  refresh();
  revalidatePath("/report/[id]/plan", "page");
  return ok(undefined);
}

export async function reviewFollowUpAction(raw: unknown): Promise<Result<void>> {
  const parsed = followUpReviewSchema.safeParse(raw);
  if (!parsed.success) return err("Check the report fields.");
  const auth = authorize(parsed.data, "plan_review");
  if (!auth.ok) return auth;

  const sent = await getFollowUpFlow().earthFeedback({
    followUpId: parsed.data.followUpId,
    windowId: parsed.data.windowId,
    decision: parsed.data.decision,
    note: parsed.data.note,
    reviewerId: auth.value,
  });
  if (!sent.ok) return err(sent.error);
  await getEcosystem().earth.flush();
  refresh();
  revalidatePath("/report/[id]/follow-up", "page");
  return ok(undefined);
}
