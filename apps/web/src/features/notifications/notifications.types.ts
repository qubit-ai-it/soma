import type { z } from "zod";

import type {
  newNotificationSchema,
  notificationSchema,
  viewerSchema,
} from "./notifications.schema.ts";

export type NewNotification = z.input<typeof newNotificationSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type Viewer = z.infer<typeof viewerSchema>;
