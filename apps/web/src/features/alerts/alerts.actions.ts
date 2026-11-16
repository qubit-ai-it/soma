"use server";

import { revalidatePath } from "next/cache";

import { authorizeCaller } from "@/features/alerts/alerts.authorize";
import { alertActionInputSchema, closeAlertInputSchema } from "@/features/alerts/alerts.schema";
import { getEcosystem } from "@/features/earth/ecosystem.server";
import { err, ok, type Result } from "@/shared/result";

function refresh() {
  revalidatePath("/earth");
}

export async function acknowledgeAlertAction(raw: unknown): Promise<Result<void>> {
  const parsed = alertActionInputSchema.safeParse(raw);
  if (!parsed.success) return err("Solicitud no válida.");
  const auth = authorizeCaller(parsed.data, "alert_acknowledge");
  if (!auth.ok) return auth;

  const result = await getEcosystem().alerts.acknowledge({ ...parsed.data, actorId: auth.value });
  if (!result.ok) return err("No se pudo reconocer: la alerta ya no está abierta o no existe.");
  refresh();
  return ok(undefined);
}

export async function closeAlertAction(raw: unknown): Promise<Result<void>> {
  const parsed = closeAlertInputSchema.safeParse(raw);
  if (!parsed.success) return err("Cerrar una alerta requiere una nota de al menos 3 caracteres.");
  const auth = authorizeCaller(parsed.data, "alert_close");
  if (!auth.ok) return auth;

  const result = await getEcosystem().alerts.close({ ...parsed.data, actorId: auth.value });
  if (!result.ok) return err("No se pudo cerrar: la alerta debe estar reconocida y abierta.");
  refresh();
  return ok(undefined);
}
