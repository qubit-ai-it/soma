"use server";

import { revalidatePath } from "next/cache";

import { authorizeSession } from "@/features/alerts/alerts.authorize.session";
import { alertActionInputSchema, closeAlertInputSchema } from "@/features/alerts/alerts.schema";
import { getEcosystem } from "@/features/earth/ecosystem.server";
import { err, ok, type Result } from "@/shared/result";

function refresh() {
  revalidatePath("/earth");
}

export async function acknowledgeAlertAction(raw: unknown): Promise<Result<void>> {
  const parsed = alertActionInputSchema.safeParse(raw);
  if (!parsed.success) return err("Invalid request.");
  const auth = await authorizeSession("alert_acknowledge");
  if (!auth.ok) return auth;

  const result = await getEcosystem().alerts.acknowledge({ ...parsed.data, actorId: auth.value });
  if (!result.ok) return err("Could not acknowledge: the alert is no longer open or does not exist.");
  refresh();
  return ok(undefined);
}

export async function closeAlertAction(raw: unknown): Promise<Result<void>> {
  const parsed = closeAlertInputSchema.safeParse(raw);
  if (!parsed.success) return err("Closing an alert requires a note of at least 3 characters.");
  const auth = await authorizeSession("alert_close");
  if (!auth.ok) return auth;

  const result = await getEcosystem().alerts.close({ ...parsed.data, actorId: auth.value });
  if (!result.ok) return err("Could not close: the alert must be acknowledged and open.");
  refresh();
  return ok(undefined);
}
