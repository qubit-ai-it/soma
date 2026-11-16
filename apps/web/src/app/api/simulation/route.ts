import { after, connection } from "next/server";
import { needsIncidentReview } from "@/features/simulation/incident";
import { getSessionCaller } from "@/features/roles/roles.session";
import { updateSchema } from "@/features/simulation/simulation";
import { getSimulation, runPendingSimulation, updateSimulation } from "@/features/simulation/simulation.store";

export const maxDuration = 150;

export async function GET() {
  await connection();
  if (!(await getSessionCaller())) return Response.json({ error: "Sign in to see the simulation." }, { status: 401 });
  const saved = await getSimulation();
  const state = needsIncidentReview(saved) ? await updateSimulation({ kind: "retry" }) : saved;
  if (state.phase === "pending") after(() => runPendingSimulation());
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!(await getSessionCaller())) return Response.json({ error: "Sign in to change the simulation." }, { status: 401 });
  const input = updateSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Check the data you entered." }, { status: 400 });
  const state = await updateSimulation(input.data);
  if (state.phase === "pending") after(() => runPendingSimulation());
  return Response.json(state);
}
