import { z } from "zod";

export const vitalsSchema = z.object({
  heartRateBpm: z.number().positive(),
  spo2Pct: z.number().min(0).max(100),
  sleepHours: z.number().min(0).max(24),
});

export const crewMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  vitals: vitalsSchema,
  cumulativeDoseMsv: z.number().min(0),
  lastCheckIn: z.iso.datetime(),
});

export const crewFileSchema = z.object({
  crew: z.array(crewMemberSchema),
});
