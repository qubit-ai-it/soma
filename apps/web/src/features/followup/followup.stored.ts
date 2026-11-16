import "server-only";

import { getFollowUpsRepository } from "@/server/repositories";

import type { FollowUpRecord } from "./followup.record";

export type StoredFollowUpView = { record: FollowUpRecord; nowMs: number };

export async function getStoredFollowUp(subjectId: string): Promise<StoredFollowUpView | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const record = await getFollowUpsRepository().latestForSubject(subjectId);
    return record ? { record, nowMs: Date.now() } : null;
  } catch {
    return null;
  }
}
