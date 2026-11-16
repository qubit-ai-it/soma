import { z } from "zod";

export const MAX_READINGS_PER_REQUEST = 500;

export const ingestBodySchema = z.object({
  subjectId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,63}$/),
  device: z.string().trim().min(1).max(80),
  readings: z
    .array(
      z.object({
        at: z.number().int().positive(),
        bpm: z.number().finite(),
      }),
    )
    .min(1)
    .max(MAX_READINGS_PER_REQUEST),
});

export type IngestBody = z.infer<typeof ingestBodySchema>;
