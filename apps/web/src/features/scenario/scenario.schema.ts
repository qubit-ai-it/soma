import { z } from "zod";

export const scenarioSeriesSchema = z.object({
  signal: z.string().min(1),
  unit: z.string().min(1),
  source: z.string().min(1),
  device: z.string().min(1).optional(),
  values: z.array(z.number().finite().nullable()).min(1),
});

export const scenarioCheckpointSchema = z.object({
  label: z.string().min(1),
  evaluatedAt: z.iso.datetime(),
});

export const scenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  subjectId: z.string().min(1),
  startDate: z.iso.date(),
  baselineUntil: z.iso.datetime(),
  checkpoints: z.array(scenarioCheckpointSchema).min(1),
  series: z.array(scenarioSeriesSchema).min(1),
});
