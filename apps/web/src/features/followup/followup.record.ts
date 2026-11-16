import { z } from "zod";

import { followUpContractSchema } from "./followup.schema.ts";

const isoDate = z.iso.datetime();

export const windowReportSchema = z.object({
  windowId: z.string().min(1),
  label: z.string().min(1),
  start: isoDate,
  end: isoDate,
  status: z.enum(["improving", "stable", "worsening", "not-evaluable"]),
  reasons: z.array(z.string()),
  escalate: z.boolean(),
  reportedAt: isoDate,
});

export const followUpRecordSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  subjectId: z.string().min(1),
  status: z.enum(["active", "closed"]),
  contract: followUpContractSchema,
  reports: z.array(windowReportSchema),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export type WindowReport = z.infer<typeof windowReportSchema>;
export type FollowUpRecord = z.infer<typeof followUpRecordSchema>;
