import "server-only";

import { getEcosystem } from "@/features/earth/ecosystem.server";
import { getPlansRepository } from "@/server/repositories";

import type { PlanRecord } from "./plan.record";

export type StoredPlanView = {
  plan: PlanRecord;
  link: "connected" | "disconnected";
  nowMs: number;
};

export async function getStoredPlan(subjectId: string): Promise<StoredPlanView | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const plan = await getPlansRepository().latestForSubject(subjectId);
    if (!plan) return null;
    const { link } = await getEcosystem().earth.getState();
    return { plan, link: link.status, nowMs: Date.now() };
  } catch {
    return null;
  }
}
