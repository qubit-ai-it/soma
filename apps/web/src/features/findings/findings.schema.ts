import { z } from "zod";

export const findingsOutputSchema = z.object({
  findings: z.string().trim().min(1).max(800),
  uncertainty: z.string().trim().min(1).max(500),
});

export type FindingsOutput = z.infer<typeof findingsOutputSchema>;
