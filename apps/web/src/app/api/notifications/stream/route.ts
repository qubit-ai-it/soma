import { viewerSchema } from "@/features/notifications/notifications.schema";
import { formatEvent, KEEPALIVE, parseCursor, RETRY } from "@/features/notifications/sse.logic";
import { getNotificationsRepository } from "@/server/repositories";

export const maxDuration = 60;

const POLL_MS = 2000;
const WINDOW_MS = 55_000;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const viewer = viewerSchema.safeParse({
    role: url.searchParams.get("role"),
    memberId: url.searchParams.get("memberId") ?? undefined,
  });
  if (!viewer.success) return Response.json({ error: "invalid viewer" }, { status: 400 });

  const repo = getNotificationsRepository();
  let cursor = parseCursor(request.headers.get("last-event-id"), url.searchParams.get("after"));
  if (cursor === undefined) {
    const [latest] = await repo.listFor(viewer.data, { limit: 1 });
    cursor = latest?.seq ?? 0;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      const startedAt = Date.now();
      try {
        send(RETRY);
        while (!request.signal.aborted && Date.now() - startedAt < WINDOW_MS) {
          const fresh = await repo.listFor(viewer.data, { afterSeq: cursor, limit: 100 });
          for (const notification of fresh) {
            send(formatEvent({ id: notification.seq, event: "notification", data: notification }));
            cursor = notification.seq;
          }
          if (fresh.length === 0) send(KEEPALIVE);
          await sleep(POLL_MS, request.signal);
        }
      } catch {
        send(formatEvent({ id: cursor ?? 0, event: "error", data: { message: "stream interrupted" } }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
