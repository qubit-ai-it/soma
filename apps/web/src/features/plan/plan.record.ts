import { z } from "zod";

import { ROLES } from "../roles/roles.types.ts";

export const PLAN_STATUSES = ["draft", "in_review", "approved", "changes_requested"] as const;
export const EARTH_DECISIONS = ["approve", "comment", "changes"] as const;

const isoDate = z.iso.datetime();

export const planReviewSchema = z.object({
  responseId: z.string().min(1),
  decision: z.enum(EARTH_DECISIONS),
  note: z.string(),
  reviewerId: z.string().min(1),
  at: isoDate,
  steps: z.array(z.string().min(1)).min(1).max(12).optional(),
});

export const planRecordSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  evaluationId: z.string().min(1),
  level: z.enum(["F2", "F3"]),
  status: z.enum(PLAN_STATUSES),
  revision: z.number().int().min(1),
  steps: z.array(z.string().min(1)).min(1),
  uncertainty: z.string().min(1),
  source: z.object({ provider: z.string().min(1), mode: z.enum(["live", "cache", "mock"]) }),
  concerns: z.array(z.string()),
  reviews: z.array(planReviewSchema),
  decided: z
    .object({
      via: z.enum(["earth", "board"]),
      role: z.enum(ROLES),
      actorId: z.string().min(1),
      at: isoDate,
    })
    .optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export type PlanStatus = (typeof PLAN_STATUSES)[number];
export type EarthDecision = (typeof EARTH_DECISIONS)[number];
export type PlanReview = z.infer<typeof planReviewSchema>;
export type PlanRecord = z.infer<typeof planRecordSchema>;

export const ACTIVE_STATUSES: readonly PlanStatus[] = ["draft", "in_review", "changes_requested"];
