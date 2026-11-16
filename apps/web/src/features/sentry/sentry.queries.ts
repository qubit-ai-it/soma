import "server-only";

import { getEvaluationsRepository } from "@/server/repositories";

import type { StoredEvaluation } from "./evaluations.repository";

export type StoredEvaluationView = { evaluation: StoredEvaluation; nowMs: number };

export async function getStoredEvaluation(subjectId: string): Promise<StoredEvaluationView | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const evaluation = await getEvaluationsRepository().latest(subjectId);
    return evaluation ? { evaluation, nowMs: Date.now() } : null;
  } catch {
    return null;
  }
}
