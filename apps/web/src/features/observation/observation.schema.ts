import { z } from "zod";

export const provenanceTypeSchema = z.enum(["real", "historical", "synthetic"]);
export const qualityStateSchema = z.enum(["valid", "suspect", "invalid", "missing"]);

export const provenanceSchema = z
  .object({
    type: provenanceTypeSchema,
    source: z.string().min(1),
    device: z.string().min(1).optional(),
    dataset: z.string().min(1).optional(),
  })
  .refine((p) => p.type !== "historical" || p.dataset !== undefined, {
    message: "historical observations must name their dataset",
    path: ["dataset"],
  });

export const qualitySchema = z.object({
  state: qualityStateSchema,
  reason: z.string().min(1).optional(),
});

export const observationSchema = z
  .object({
    id: z.string().min(1),
    subjectId: z.string().min(1),
    signal: z.string().min(1),
    value: z.union([z.number().finite(), z.string().min(1)]).nullable(),
    unit: z.string().min(1),
    observedAt: z.iso.datetime(),
    receivedAt: z.iso.datetime().optional(),
    missionTime: z.string().min(1).optional(),
    provenance: provenanceSchema,
    quality: qualitySchema,
    processingVersion: z.string().min(1).optional(),
  })
  .superRefine((obs, ctx) => {
    const { state, reason } = obs.quality;
    const needsReason = state !== "valid";
    if (needsReason && reason === undefined) {
      ctx.addIssue({
        code: "custom",
        message: `quality "${state}" requires a reason`,
        path: ["quality", "reason"],
      });
    }
    if (state === "missing" && obs.value !== null) {
      ctx.addIssue({
        code: "custom",
        message: "a missing observation must not carry a value",
        path: ["value"],
      });
    }
    if (state !== "missing" && obs.value === null) {
      ctx.addIssue({
        code: "custom",
        message: "a non-missing observation requires a value",
        path: ["value"],
      });
    }
  });
