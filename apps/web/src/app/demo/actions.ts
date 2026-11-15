"use server";

import { revalidatePath } from "next/cache";

import { getEcosystem } from "@/features/earth/ecosystem.server";

export async function raiseDemoF3Alert(): Promise<{ ok: boolean; message: string }> {
  const result = await getEcosystem().alerts.raise({
    alertId: "demo-f3-cm-01",
    memberId: "cm-01",
    memberLabel: "Tripulante cm-01",
    level: "F3",
    title: "Regla crítica activada (demostración)",
    action: "Seguir el protocolo aprobado y escalar al médico de a bordo.",
  });
  if (!result.ok) return { ok: false, message: "No se pudo generar la alerta de demostración." };
  revalidatePath("/alertas");
  revalidatePath("/tierra");
  return { ok: true, message: "Alerta F3 generada y notificación en cola hacia Tierra." };
}
