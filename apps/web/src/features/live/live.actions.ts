"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getEcosystem } from "@/features/earth/ecosystem.server";
import { DEMO_ACTORS } from "@/features/roles/roles.logic";

const inputSchema = z.object({ bpm: z.number().finite().min(20).max(260) });

export async function escalateLiveAlert(raw: unknown): Promise<{ ok: boolean; message: string }> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Lectura no válida." };

  const member = DEMO_ACTORS.astronaut;
  const minute = Math.floor(Date.now() / 60000);
  const result = await getEcosystem().alerts.raise({
    alertId: `live-f3-${minute}`,
    memberId: member.memberId ?? "cm-02",
    memberLabel: member.label,
    level: "F3",
    title: "Frecuencia cardíaca muy alta",
    action: "Seguir el protocolo aprobado y avisar al médico de a bordo.",
    clinicalDetail: `${Math.round(parsed.data.bpm)} lpm medidos por el dispositivo conectado.`,
  });
  if (!result.ok) return { ok: false, message: "No se pudo generar la alerta." };

  revalidatePath("/tierra");
  return { ok: true, message: "Alerta enviada a Tierra." };
}
