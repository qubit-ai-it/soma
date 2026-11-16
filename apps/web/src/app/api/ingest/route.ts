import { after } from "next/server";

import { getSessionCaller } from "@/features/roles/roles.session";
import { toBlockObservations } from "@/features/ingest/ingest.logic";
import { ingestBodySchema } from "@/features/ingest/ingest.schema";
import { getObservationsRepository } from "@/server/repositories";
import { getSentry } from "@/server/sentry.server";

export async function POST(request: Request) {
  const caller = await getSessionCaller();
  if (!caller) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!caller.memberId) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = ingestBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "invalid body" }, { status: 400 });

  if (body.data.subjectId !== caller.memberId) return Response.json({ error: "forbidden" }, { status: 403 });

  const repo = getObservationsRepository();
  const observations = toBlockObservations(body.data, Date.now());
  const { stored, duplicates } = await repo.addMany(observations);
  if (stored > 0) after(() => getSentry().process(body.data.subjectId));
  return Response.json({ stored, duplicates }, { headers: { "cache-control": "no-store" } });
}
