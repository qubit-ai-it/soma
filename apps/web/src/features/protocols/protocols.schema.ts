import { z } from "zod";

export const triggerLevelSchema = z.enum(["F1", "F2", "F3"]);

export const protocolSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(300),
  steps: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        text: z.string().trim().min(1).max(300),
      }),
    )
    .min(2)
    .max(8),
  triggers: z.object({
    ruleIds: z.array(z.string().min(1)),
    signals: z.array(z.string().min(1)),
    minStatus: triggerLevelSchema.optional(),
    anyEvaluable: z.boolean().optional(),
  }),
  approval: z.object({
    approvedBy: z.string().trim().min(1),
    version: z.string().trim().min(1),
    approvedAt: z.iso.datetime(),
    source: z.string().trim().min(1),
    demonstration: z.literal(true),
  }),
});

export const protocolLibrarySchema = z
  .object({
    version: z.string().min(1),
    protocols: z.array(protocolSchema).min(1),
  })
  .refine(
    (library) => new Set(library.protocols.map((p) => p.id)).size === library.protocols.length,
    { message: "Duplicate protocol id" },
  );
