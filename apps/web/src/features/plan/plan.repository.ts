import type { Result } from "../../shared/result.ts";
import type { PlanRecord, PlanStatus } from "./plan.record.ts";

export type PlansRepository = {
  add(plan: PlanRecord): Promise<{ plan: PlanRecord; duplicate: boolean }>;
  get(id: string): Promise<PlanRecord | null>;
  latestForSubject(subjectId: string): Promise<PlanRecord | null>;
  activeForSubject(subjectId: string): Promise<PlanRecord | null>;
  list(options?: { statuses?: readonly PlanStatus[]; limit?: number }): Promise<PlanRecord[]>;
  update(id: string, fn: (plan: PlanRecord) => Result<PlanRecord>): Promise<Result<PlanRecord>>;
};
