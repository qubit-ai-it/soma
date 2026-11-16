import { z } from "zod";

import { viewerFromCaller } from "@/features/notifications/notifications.logic";
import { getSessionCaller } from "@/features/roles/roles.session";
import { getNotificationsRepository } from "@/server/repositories";

const NO_STORE = { "cache-control": "no-store" };

const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });

export async function GET() {
  const caller = await getSessionCaller();
  if (!caller) return unauthorized();
  const notifications = await getNotificationsRepository().listFor(viewerFromCaller(caller), { limit: 50 });
  return Response.json({ notifications }, { headers: NO_STORE });
}

const readSchema = z.object({ id: z.string().min(1) });

export async function PATCH(request: Request) {
  const caller = await getSessionCaller();
  if (!caller) return unauthorized();
  const body = readSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "invalid body" }, { status: 400 });
  const done = await getNotificationsRepository().markRead(body.data.id, viewerFromCaller(caller));
  return Response.json({ ok: done }, { status: done ? 200 : 404, headers: NO_STORE });
}
