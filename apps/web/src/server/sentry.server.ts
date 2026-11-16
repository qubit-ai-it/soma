import "server-only";

import { getEcosystem } from "../features/earth/ecosystem.server.ts";
import { DEMO_ACTORS } from "../features/roles/roles.logic.ts";
import { LIVE_SUBJECT } from "../features/live/live.logic.ts";
import { createSentryService, type SentryService } from "../features/sentry/sentry.service.ts";
import { SIM_SUBJECTS } from "../features/sentry/sentry.simulation.ts";
import { createSentryTalk, type SentryTalk } from "../features/sentry/sentry.talk.service.ts";
import {
  getEvaluationsRepository,
  getNotificationsRepository,
  getObservationsRepository,
} from "./repositories";
import { getFollowUpFlow } from "./followup.server.ts";
import { getPlanFlow } from "./plans.server.ts";
import { getServices } from "./services.ts";

const cache = globalThis as unknown as { somaSentry?: SentryService; somaSentryTalk?: SentryTalk };

const labelFor = (memberId: string) => `Tripulante ${memberId}`;

export function getSentry(): SentryService {
  cache.somaSentry ??= createSentryService({
    observations: getObservationsRepository(),
    evaluations: getEvaluationsRepository(),
    notifications: getNotificationsRepository(),
    raiseAlert: (input) => getEcosystem().alerts.raise(input),
    memberFor: (subjectId) =>
      subjectId === LIVE_SUBJECT ? (DEMO_ACTORS.astronaut.memberId ?? subjectId) : subjectId,
    labelFor,
    onEvaluationSaved: (evaluation) => getPlanFlow().onEvaluationSaved(evaluation),
  });
  return cache.somaSentry;
}

export function getSentryTalk(): SentryTalk {
  cache.somaSentryTalk ??= createSentryTalk({
    notifications: getNotificationsRepository(),
    members: SIM_SUBJECTS.map((id) => ({ id, label: labelFor(id) })),
    alerts: () => getEcosystem().alertsRepo.list(),
    latestStatus: async (memberId) => (await getEvaluationsRepository().latest(memberId))?.status ?? null,
    earthLink: async () => {
      const { link } = await getEcosystem().earth.getState();
      return { status: link.status, updatedAt: link.updatedAt };
    },
    spaceWeather: () => getServices().spaceWeather.getSnapshot(),
  });
  return cache.somaSentryTalk;
}

export async function runSentryClock(nowMs: number) {
  const crew = await getSentry().tick(nowMs);
  const stale = await getSentry().checkStale(nowMs, [...SIM_SUBJECTS, LIVE_SUBJECT]);
  const talk = await getSentryTalk().run(nowMs);
  const followup = await getFollowUpFlow().sync(nowMs);
  if (followup.reported > 0) await getEcosystem().earth.flush();
  return { crew, stale, talk, followup };
}
