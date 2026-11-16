import { randomUUID } from "node:crypto";

import type { Pool } from "pg";

import { newNotificationSchema, notificationSchema } from "./notifications.schema.ts";
import { isVisibleTo, readerKey, viewerKeys } from "./notifications.logic.ts";
import type { NotificationsRepository } from "./notifications.repository.ts";
import type { Notification, Viewer } from "./notifications.types.ts";

type Row = {
  id: string;
  dedupe_key: string;
  kind: string;
  priority: string;
  title: string;
  body: string | null;
  member_id: string | null;
  audience: string[];
  payload: Record<string, unknown>;
  created_at: Date;
  read: boolean;
};

function toNotification(row: Row): Notification {
  return notificationSchema.parse({
    id: row.id,
    dedupeKey: row.dedupe_key,
    kind: row.kind,
    priority: row.priority,
    title: row.title,
    body: row.body ?? undefined,
    memberId: row.member_id ?? undefined,
    audience: row.audience,
    payload: row.payload,
    createdAt: row.created_at.toISOString(),
    read: row.read,
  });
}

const SELECT = `
  select n.*, exists (
    select 1 from notification_reads r where r.notification_id = n.id and r.recipient = $1
  ) as read
  from notifications n`;

export function createPostgresNotificationsRepository(pool: Pool): NotificationsRepository {
  return {
    add: async (raw) => {
      const input = newNotificationSchema.parse(raw);
      const inserted = await pool.query(
        `insert into notifications (id, dedupe_key, kind, priority, title, body, member_id, audience, payload)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (dedupe_key) do nothing
         returning id`,
        [
          randomUUID(),
          input.dedupeKey,
          input.kind,
          input.priority,
          input.title,
          input.body ?? null,
          input.memberId ?? null,
          input.audience,
          JSON.stringify(input.payload),
        ],
      );
      const { rows } = await pool.query<Row>(`${SELECT} where n.dedupe_key = $2`, ["", input.dedupeKey]);
      return { notification: toNotification(rows[0]), duplicate: inserted.rowCount === 0 };
    },
    listFor: async (viewer: Viewer, options = {}) => {
      const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
      const { rows } = await pool.query<Row>(
        `${SELECT}
         where n.audience && $2::text[]
         order by n.created_at desc
         limit $3`,
        [readerKey(viewer), viewerKeys(viewer), limit],
      );
      return rows
        .map(toNotification)
        .filter((n) => isVisibleTo(n.audience, viewer))
        .filter((n) => !options.unreadOnly || !n.read);
    },
    markRead: async (id, viewer) => {
      const { rows } = await pool.query<Row>(`${SELECT} where n.id = $2`, [readerKey(viewer), id]);
      if (!rows[0] || !isVisibleTo(rows[0].audience, viewer)) return false;
      await pool.query(
        `insert into notification_reads (notification_id, recipient) values ($1,$2)
         on conflict do nothing`,
        [id, readerKey(viewer)],
      );
      return true;
    },
  };
}
