import { after, connection } from "next/server";
import { needsIncidentReview } from "@/features/simulation/incident";
import { updateSchema } from "@/features/simulation/simulation";
import { getSimulation, runPendingSimulation, updateSimulation } from "@/features/simulation/simulation.store";

export const maxDuration = 150;
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sessionId(request: Request): string | null {
  const value = request.headers.get("x-simulation-session");
  return value && sessionPattern.test(value) ? value : null;
}

export async function GET(request: Request) {
  await connection();
  const id = sessionId(request);
  if (!id) return Response.json({ error: "Invalid simulation session." }, { status: 400 });
  const saved = await getSimulation(id);
  const state = needsIncidentReview(saved) ? await updateSimulation(id, { kind: "retry" }) : saved;
  if (state.phase === "pending") after(() => runPendingSimulation(id));
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const id = sessionId(request);
  if (!id) return Response.json({ error: "Invalid simulation session." }, { status: 400 });
  const input = updateSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Check the data you entered." }, { status: 400 });
  const state = await updateSimulation(id, input.data);
  if (state.phase === "pending") after(() => runPendingSimulation(id));
  return Response.json(state);
}
