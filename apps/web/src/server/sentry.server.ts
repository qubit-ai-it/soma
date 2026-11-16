import "server-only";

import { getEcosystem } from "../features/earth/ecosystem.server.ts";
import { DEMO_ACTORS } from "../features/roles/roles.logic.ts";
import { LIVE_SUBJECT } from "../features/live/live.logic.ts";
import { createSentryService, type SentryService } from "../features/sentry/sentry.service.ts";
import {
  getEvaluationsRepository,
  getNotificationsRepository,
  getObservationsRepository,
} from "./repositories";

const cache = globalThis as unknown as { somaSentry?: SentryService };

export function getSentry(): SentryService {
  cache.somaSentry ??= createSentryService({
    observations: getObservationsRepository(),
    evaluations: getEvaluationsRepository(),
    notifications: getNotificationsRepository(),
    raiseAlert: (input) => getEcosystem().alerts.raise(input),
    memberFor: (subjectId) =>
      subjectId === LIVE_SUBJECT ? (DEMO_ACTORS.astronaut.memberId ?? subjectId) : subjectId,
    labelFor: (memberId) => `Tripulante ${memberId}`,
  });
  return cache.somaSentry;
}
