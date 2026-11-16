"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getEcosystem } from "@/features/earth/ecosystem.server";
import { DEMO_ACTORS } from "@/features/roles/roles.logic";

const inputSchema = z.object({ bpm: z.number().finite().min(20).max(260) });

export async function escalateLiveAlert(raw: unknown): Promise<{ ok: boolean; message: string }> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Invalid reading." };

  const member = DEMO_ACTORS.astronaut;
  const minute = Math.floor(Date.now() / 60000);
  const result = await getEcosystem().alerts.raise({
    alertId: `live-f3-${minute}`,
    memberId: member.memberId ?? "cm-02",
    memberLabel: member.label,
    level: "F3",
    title: "Very high heart rate",
    action: "Follow the approved protocol and notify the onboard physician.",
    clinicalDetail: `${Math.round(parsed.data.bpm)} bpm measured by the connected device.`,
  });
  if (!result.ok) return { ok: false, message: "Could not raise the alert." };

  revalidatePath("/earth");
  return { ok: true, message: "Alert sent to Earth." };
}
