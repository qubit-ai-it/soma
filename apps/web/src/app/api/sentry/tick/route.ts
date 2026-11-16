import { getSentry } from "@/server/sentry.server";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await getSentry().tick(Date.now());
  const crew = summary.map((s) => ({
    subject: s.subject,
    emitted: s.emitted,
    phase: s.outcome.phase,
    status: s.outcome.phase === "evaluated" ? s.outcome.evaluation.status : null,
    raised: s.outcome.phase === "evaluated" ? s.outcome.raised : false,
  }));
  return Response.json({ crew }, { headers: { "cache-control": "no-store" } });
}
