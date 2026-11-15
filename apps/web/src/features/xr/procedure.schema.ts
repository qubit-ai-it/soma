import { z } from "zod";

export const procedureStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  instruction: z.string().min(1),
  optional: z.boolean().default(false),
  safetyNote: z.string().min(1).optional(),
});

export const procedureSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    steps: z.array(procedureStepSchema).min(1),
  })
  .refine((p) => new Set(p.steps.map((s) => s.id)).size === p.steps.length, {
    message: "step ids must be unique",
    path: ["steps"],
  });

export const procedureFileSchema = z
  .object({ procedures: z.array(procedureSchema) })
  .refine((f) => new Set(f.procedures.map((p) => p.id)).size === f.procedures.length, {
    message: "procedure ids must be unique",
    path: ["procedures"],
  });

export const stepStatusSchema = z.enum(["pending", "done", "skipped", "failed"]);

export const logEntrySchema = z.object({
  at: z.iso.datetime(),
  action: z.enum(["started", "completed", "skipped", "failed", "back", "finished", "aborted"]),
  stepId: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
});

export const sessionStateSchema = z.object({
  procedureId: z.string().min(1),
  mode: z.enum(["practice", "live"]),
  currentIndex: z.number().int().min(0),
  statuses: z.array(stepStatusSchema).min(1),
  phase: z.enum(["in-progress", "completed", "aborted"]),
  log: z.array(logEntrySchema),
});
