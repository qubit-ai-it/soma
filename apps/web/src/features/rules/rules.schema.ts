import { z } from "zod";

export const signalRuleSchema = z.object({
  id: z.string().min(1),
  signal: z.string().min(1),
  direction: z.enum(["increase", "decrease"]),
  minNormalizedDelta: z.number().positive().finite(),
  minConsecutive: z.number().int().min(1),
  level: z.enum(["F1", "F2", "F3"]),
});

export const convergenceRuleSchema = z.object({
  id: z.string().min(1),
  minSignals: z.number().int().min(2),
  level: z.enum(["F2", "F3"]),
});

export const ruleSetSchema = z
  .object({
    version: z.string().min(1),
    rules: z.array(signalRuleSchema).min(1),
    convergence: z.array(convergenceRuleSchema).default([]),
  })
  .refine(
    (set) => {
      const ids = [...set.rules, ...set.convergence].map((r) => r.id);
      return new Set(ids).size === ids.length;
    },
    { message: "rule ids must be unique", path: ["rules"] },
  );
