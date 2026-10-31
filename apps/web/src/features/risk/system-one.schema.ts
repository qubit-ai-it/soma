import { z } from "zod";

const unit = z.number().min(0).max(1);

export const choiceAnswerSchema = z.object({
  type: z.literal("choice"),
  choice: z.string(),
  confidence: unit,
  probabilities: z.record(z.string(), unit),
});

export const systemOneResponseSchema = z.object({
  model: z.string().optional(),
  answers: z.record(z.string(), choiceAnswerSchema),
  usage: z
    .object({ input_tokens: z.number(), output_tokens: z.number() })
    .partial()
    .optional(),
});

export type ChoiceAnswer = z.infer<typeof choiceAnswerSchema>;
export type SystemOneResponse = z.infer<typeof systemOneResponseSchema>;
