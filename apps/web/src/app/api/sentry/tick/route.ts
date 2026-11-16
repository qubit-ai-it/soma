import { runSentryClock } from "@/server/sentry.server";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { crew, talk } = await runSentryClock(Date.now());
  const summary = crew.map((s) => ({
    subject: s.subject,
    emitted: s.emitted,
    phase: s.outcome.phase,
    status: s.outcome.phase === "evaluated" ? s.outcome.evaluation.status : null,
    raised: s.outcome.phase === "evaluated" ? s.outcome.raised : false,
  }));
  return Response.json({ crew: summary, talk }, { headers: { "cache-control": "no-store" } });
}
