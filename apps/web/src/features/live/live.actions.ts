"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getEcosystem } from "@/features/earth/ecosystem.server";
import { getSessionCaller } from "@/features/roles/roles.session";
import { getServices } from "@/server/services";

const inputSchema = z.object({ bpm: z.number().finite().min(20).max(260) });

export async function escalateLiveAlert(raw: unknown): Promise<{ ok: boolean; message: string }> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Invalid reading." };

  const caller = await getSessionCaller();
  if (!caller?.memberId) return { ok: false, message: "Sign in to send alerts." };
  const member = await getServices().crew.get(caller.memberId);
  if (!member) return { ok: false, message: "Crew member not found." };
  const minute = Math.floor(Date.now() / 60000);
  const result = await getEcosystem().alerts.raise({
    alertId: `live-f3-${minute}`,
    memberId: member.id,
    memberLabel: member.name,
    level: "F3",
    title: "Very high heart rate",
    action: "Follow the approved protocol and notify the onboard physician.",
    clinicalDetail: `${Math.round(parsed.data.bpm)} bpm measured by the connected device.`,
  });
  if (!result.ok) return { ok: false, message: "Could not raise the alert." };

  revalidatePath("/earth");
  return { ok: true, message: "Alert sent to Earth." };
}
