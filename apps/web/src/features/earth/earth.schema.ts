import { z } from "zod";

export const PACKET_KINDS = [
  "alert_notification",
  "plan_response",
  "plan_review_request",
  "plan_review_response",
  "followup_report",
  "followup_feedback",
  "event",
] as const;
export const DIRECTIONS = ["to_earth", "to_station"] as const;
export const PACKET_STATUSES = ["queued", "acked", "failed"] as const;
export const DECISIONS = ["approve", "modify", "reject"] as const;

const isoDate = z.iso.datetime();

export const packetSchema = z.object({
  id: z.string().min(1),
  seq: z.number().int().min(1),
  idempotencyKey: z.string().min(1).max(200),
  kind: z.enum(PACKET_KINDS),
  direction: z.enum(DIRECTIONS),
  payload: z.record(z.string(), z.json()),
  createdAt: isoDate,
  status: z.enum(PACKET_STATUSES),
  attempts: z.number().int().min(0),
  nextAttemptAt: isoDate,
  lastAttemptAt: isoDate.optional(),
  lastError: z.string().optional(),
  ackedAt: isoDate.optional(),
});

export const linkSchema = z.object({
  status: z.enum(["connected", "disconnected"]),
  latencyMs: z.number().int().min(0).max(3_600_000),
  ackLoss: z.boolean(),
  updatedAt: isoDate,
});

export const receiptSchema = z.object({
  idempotencyKey: z.string().min(1),
  packetId: z.string().min(1),
  direction: z.enum(DIRECTIONS),
  receivedAt: isoDate,
});

export const reviewSchema = z.object({
  decision: z.enum(DECISIONS),
  steps: z.array(z.string().min(1)).min(1).optional(),
  note: z.string(),
  actorId: z.string().min(1),
  decidedAt: isoDate,
  packetId: z.string().min(1),
});

export const proposalSchema = z.object({
  id: z.string().min(1),
  subject: z.object({ memberId: z.string().min(1), label: z.string().min(1) }),
  title: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  source: z.object({ provider: z.string().min(1), version: z.string().min(1) }),
  createdAt: isoDate,
  review: reviewSchema.optional(),
});

export const earthStateSchema = z.object({
  link: linkSchema,
  nextSeq: z.number().int().min(1),
  queue: z.array(packetSchema),
  inbox: z.array(receiptSchema),
  proposals: z.array(proposalSchema),
});

const stepsInput = z.array(z.string().trim().min(1).max(400)).min(1).max(12);

export const reviewInputSchema = z.discriminatedUnion("decision", [
  z.object({
    proposalId: z.string().trim().min(1).max(64),
    decision: z.literal("approve"),
    note: z.string().trim().max(1000).default(""),
  }),
  z.object({
    proposalId: z.string().trim().min(1).max(64),
    decision: z.literal("modify"),
    steps: stepsInput,
    note: z.string().trim().min(3).max(1000),
  }),
  z.object({
    proposalId: z.string().trim().min(1).max(64),
    decision: z.literal("reject"),
    note: z.string().trim().min(3).max(1000),
  }),
]);

export const linkPatchSchema = z.object({
  status: z.enum(["connected", "disconnected"]).optional(),
  latencyMs: z.number().int().min(0).max(3_600_000).optional(),
  ackLoss: z.boolean().optional(),
});
