import { z } from "zod";

import { viewerSchema } from "@/features/notifications/notifications.schema";
import { getNotificationsRepository } from "@/server/repositories";

const NO_STORE = { "cache-control": "no-store" };

function readViewer(url: URL) {
  return viewerSchema.safeParse({
    role: url.searchParams.get("role"),
    memberId: url.searchParams.get("memberId") ?? undefined,
  });
}

export async function GET(request: Request) {
  const viewer = readViewer(new URL(request.url));
  if (!viewer.success) return Response.json({ error: "invalid viewer" }, { status: 400 });
  const notifications = await getNotificationsRepository().listFor(viewer.data, { limit: 50 });
  return Response.json({ notifications }, { headers: NO_STORE });
}

const readSchema = z.object({ id: z.string().min(1), viewer: viewerSchema });

export async function PATCH(request: Request) {
  const body = readSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "invalid body" }, { status: 400 });
  const done = await getNotificationsRepository().markRead(body.data.id, body.data.viewer);
  return Response.json({ ok: done }, { status: done ? 200 : 404, headers: NO_STORE });
}
