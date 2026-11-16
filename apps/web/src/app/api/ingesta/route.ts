import { toBlockObservations } from "@/features/ingest/ingest.logic";
import { ingestBodySchema } from "@/features/ingest/ingest.schema";
import { getObservationsRepository } from "@/server/repositories";

export async function POST(request: Request) {
  const body = ingestBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "invalid body" }, { status: 400 });

  const repo = getObservationsRepository();
  const observations = toBlockObservations(body.data, Date.now());
  let stored = 0;
  let duplicates = 0;
  for (const observation of observations) {
    const result = await repo.add(observation);
    if (result.duplicate) duplicates += 1;
    else stored += 1;
  }
  return Response.json({ stored, duplicates }, { headers: { "cache-control": "no-store" } });
}
