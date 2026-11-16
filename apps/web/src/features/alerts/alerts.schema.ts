import { z } from "zod";

import { ROLES } from "../roles/roles.types.ts";

export const AUDIT_ACTIONS = [
  "alert_raised",
  "alert_escalated",
  "alert_acknowledged",
  "alert_closed",
  "plan_review",
  "plan_drafted",
  "plan_submitted",
] as const;

const isoDate = z.iso.datetime();
const roleSchema = z.enum(ROLES);

export const actorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("human"), id: z.string().min(1), role: roleSchema }),
  z.object({ kind: z.literal("system"), id: z.string().min(1) }),
]);

export const aiProposalSchema = z.object({
  proposalId: z.string().min(1),
  title: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  provider: z.string().min(1),
  version: z.string().min(1),
});

export const humanDecisionSchema = z.object({
  decision: z.enum(["approve", "modify", "reject"]),
  steps: z.array(z.string().min(1)).min(1).optional(),
  note: z.string(),
});

export const auditEntrySchema = z.object({
  id: z.string().min(1),
  seq: z.number().int().min(1),
  at: isoDate,
  action: z.enum(AUDIT_ACTIONS),
  actor: actorSchema,
  subjectId: z.string().min(1).optional(),
  alertId: z.string().min(1).optional(),
  detail: z.string().optional(),
  aiProposal: aiProposalSchema.optional(),
  humanDecision: humanDecisionSchema.optional(),
  idempotencyKey: z.string().min(1).optional(),
  prevHash: z.string().length(64),
  hash: z.string().length(64),
});

export const auditFileSchema = z.object({
  entries: z.array(auditEntrySchema),
});

export const ALERT_LEVELS = ["F2", "F3", "NOT_EVALUABLE"] as const;
export const ALERT_STATUSES = ["open", "acknowledged", "closed"] as const;

export const alertSchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
  memberLabel: z.string().min(1),
  level: z.enum(ALERT_LEVELS),
  title: z.string().min(1),
  action: z.string().min(1),
  recipients: z.array(roleSchema).min(1),
  clinicalDetail: z.string().optional(),
  status: z.enum(ALERT_STATUSES),
  createdAt: isoDate,
  source: z.string().min(1),
  acknowledged: z
    .object({ actorId: z.string().min(1), role: roleSchema, at: isoDate })
    .optional(),
  closed: z
    .object({ actorId: z.string().min(1), role: roleSchema, at: isoDate, note: z.string() })
    .optional(),
});

export const alertsFileSchema = z.object({
  alerts: z.array(alertSchema),
});

export const alertActionInputSchema = z.object({
  alertId: z.string().trim().min(1).max(64),
  actorId: z.string().trim().min(1).max(64),
  role: roleSchema,
});

export const closeAlertInputSchema = alertActionInputSchema.extend({
  note: z.string().trim().min(3).max(1000),
});
