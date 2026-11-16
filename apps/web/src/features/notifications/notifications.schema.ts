import { z } from "zod";

import { ROLES } from "../roles/roles.types.ts";

export const NOTIFICATION_KINDS = [
  "alert",
  "checkin",
  "reminder",
  "summary",
  "link",
  "space_weather",
  "earth_response",
  "plan",
  "followup",
  "task",
] as const;

export const PRIORITIES = ["low", "normal", "high", "critical"] as const;

export const viewerSchema = z.object({
  role: z.enum(ROLES),
  memberId: z.string().min(1).optional(),
});

export const newNotificationSchema = z.object({
  dedupeKey: z.string().min(1).max(200),
  kind: z.enum(NOTIFICATION_KINDS),
  priority: z.enum(PRIORITIES),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(280).optional(),
  memberId: z.string().min(1).optional(),
  audience: z.array(z.string().min(1)).min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const notificationSchema = newNotificationSchema.extend({
  id: z.string().min(1),
  seq: z.number().int(),
  createdAt: z.iso.datetime(),
  read: z.boolean(),
});
