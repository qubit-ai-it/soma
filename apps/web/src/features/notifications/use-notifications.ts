"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { mergeNotifications } from "./notifications.display";
import { notificationSchema } from "./notifications.schema";
import type { Notification, Viewer } from "./notifications.types";

function query(viewer: Viewer): string {
  const params = new URLSearchParams({ role: viewer.role });
  if (viewer.memberId) params.set("memberId", viewer.memberId);
  return params.toString();
}

export function useNotifications(viewer: Viewer, onAlert: () => void) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const alertRef = useRef(onAlert);
  useEffect(() => {
    alertRef.current = onAlert;
  });

  const { role, memberId } = viewer;

  useEffect(() => {
    let closed = false;
    let source: EventSource | null = null;
    const scope: Viewer = { role, memberId };

    async function connect() {
      let after = 0;
      try {
        const response = await fetch(`/api/notificaciones?${query(scope)}`, { cache: "no-store" });
        if (response.ok) {
          const body = (await response.json()) as { notifications?: unknown[] };
          const parsed = (body.notifications ?? []).flatMap((item) => {
            const result = notificationSchema.safeParse(item);
            return result.success ? [result.data] : [];
          });
          if (closed) return;
          setNotifications(parsed.sort((a, b) => b.seq - a.seq));
          after = parsed.reduce((max, n) => Math.max(max, n.seq), 0);
        }
      } catch {
        // the stream below still delivers new items
      }
      if (closed) return;

      source = new EventSource(`/api/notificaciones/stream?${query(scope)}&after=${after}`);
      source.addEventListener("notification", (event) => {
        try {
          const parsed = notificationSchema.safeParse(JSON.parse((event as MessageEvent<string>).data));
          if (!parsed.success) return;
          setNotifications((current) => mergeNotifications(current, [parsed.data]));
          if (parsed.data.kind === "alert") alertRef.current();
        } catch {
          // ignore a malformed event
        }
      });
    }

    void connect();
    return () => {
      closed = true;
      source?.close();
      setNotifications([]);
    };
  }, [role, memberId]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      setNotifications((current) => current.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
      await Promise.all(
        ids.map((id) =>
          fetch("/api/notificaciones", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id, viewer: { role, memberId } }),
          }).catch(() => undefined),
        ),
      );
    },
    [role, memberId],
  );

  return { notifications, markRead };
}
