import type { NewNotification, Notification, Viewer } from "./notifications.types.ts";

export type NotificationsRepository = {
  add(input: NewNotification): Promise<{ notification: Notification; duplicate: boolean }>;
  listFor(viewer: Viewer, options?: { limit?: number; unreadOnly?: boolean }): Promise<Notification[]>;
  markRead(id: string, viewer: Viewer): Promise<boolean>;
};
