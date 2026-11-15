import { z } from "zod";

export const followUpTargetSchema = z.object({
  signal: z.string().min(1),
  expectedDirection: z.enum(["increase", "decrease"]),
});

export const reviewWindowSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    start: z.iso.datetime(),
    end: z.iso.datetime(),
  })
  .refine((w) => Date.parse(w.start) < Date.parse(w.end), { message: "window must have positive length" });

export const followUpContractSchema = z.object({
  subjectId: z.string().min(1),
  planStartedAt: z.iso.datetime(),
  baselineFrozenAt: z.iso.datetime(),
  minBaselineObservations: z.number().int().positive(),
  referenceWindow: z.object({ start: z.iso.datetime(), end: z.iso.datetime() }),
  targets: z.array(followUpTargetSchema).min(1),
  windows: z.array(reviewWindowSchema).min(1),
  thresholds: z.object({
    improveFraction: z.number().positive().max(1),
    worsenFraction: z.number().positive().max(1),
    minReferenceHarm: z.number().positive(),
    minObservationsPerWindow: z.number().int().positive(),
  }),
  hysteresis: z.object({ consecutiveWindows: z.number().int().min(2) }),
  adherence: z.object({
    plannedStepsPerWindow: z.number().int().positive(),
    plannedXrSessionsPerWindow: z.number().int().nonnegative(),
    minRatio: z.number().min(0).max(1),
    maxDrop: z.number().min(0).max(1),
  }),
});
