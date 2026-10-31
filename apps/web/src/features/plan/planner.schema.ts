import { z } from "zod";

// requiresHumanValidation is not model output: the client sets it
export const plannerOutputSchema = z.object({
  steps: z.array(z.string().trim().min(1).max(300)).min(3).max(8),
  uncertainty: z.string().trim().min(1).max(500),
});

export type PlannerOutput = z.infer<typeof plannerOutputSchema>;

const jsonSchema: Record<string, unknown> = { ...z.toJSONSchema(plannerOutputSchema) };
delete jsonSchema.$schema;

export const plannerOutputJsonSchema = jsonSchema;
