import type { Result } from "../../shared/result.ts";
import type { FollowUpRecord } from "./followup.record.ts";

export type FollowUpsRepository = {
  add(record: FollowUpRecord): Promise<{ record: FollowUpRecord; duplicate: boolean }>;
  get(id: string): Promise<FollowUpRecord | null>;
  getByPlan(planId: string): Promise<FollowUpRecord | null>;
  latestForSubject(subjectId: string): Promise<FollowUpRecord | null>;
  listActive(): Promise<FollowUpRecord[]>;
  listRecent(limit?: number): Promise<FollowUpRecord[]>;
  update(id: string, fn: (record: FollowUpRecord) => Result<FollowUpRecord>): Promise<Result<FollowUpRecord>>;
};
