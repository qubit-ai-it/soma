"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { authorizeCaller as authorize } from "@/features/alerts/alerts.authorize";
import { linkPatchSchema, reviewInputSchema } from "@/features/earth/earth.schema";
import { getEcosystem } from "@/features/earth/ecosystem.server";
import { ROLES } from "@/features/roles/roles.types";
import { err, ok, type Result } from "@/shared/result";

const callerSchema = z.object({
  role: z.enum(ROLES),
  actorId: z.string().trim().min(1).max(64),
});

const linkSchema = callerSchema.extend({ patch: linkPatchSchema });
const flushSchema = callerSchema.extend({ force: z.boolean() });
const reviewSchema = callerSchema.extend({ review: reviewInputSchema });

function refresh() {
  revalidatePath("/tierra");
}

export async function setLinkAction(raw: unknown): Promise<Result<void>> {
  const parsed = linkSchema.safeParse(raw);
  if (!parsed.success) return err("Solicitud no válida.");
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
  if (!parsed.success) return err("Solicitud no válida.");
  const auth = authorize(parsed.data, "earth_console");
  if (!auth.ok) return auth;

  await getEcosystem().earth.flush({ force: parsed.data.force });
  refresh();
  return ok(undefined);
}

export async function reviewProposalAction(raw: unknown): Promise<Result<void>> {
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    return err("Revisa los campos: la modificación y el rechazo necesitan una nota, y la modificación al menos un paso.");
  }
  const auth = authorize(parsed.data, "plan_review");
  if (!auth.ok) return auth;

  const { earth } = getEcosystem();
  const reviewed = await earth.review(parsed.data.review, auth.value);
  if (!reviewed.ok) return err("Esta propuesta ya fue revisada o no existe.");
  await earth.flush();
  refresh();
  return ok(undefined);
}
