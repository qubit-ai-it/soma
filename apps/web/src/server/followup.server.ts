import "server-only";

import { getEcosystem } from "../features/earth/ecosystem.server.ts";
import { createFollowUpFlow, DEFAULT_TIMING, type FollowUpFlow } from "../features/followup/followup.flow.ts";
import {
  getFollowUpsRepository,
  getNotificationsRepository,
  getObservationsRepository,
  getPlansRepository,
} from "./repositories";

const cache = globalThis as unknown as { somaFollowUp?: FollowUpFlow };

function timing() {
  const minutes = Number(process.env.SENTRY_FOLLOWUP_WINDOW_MINUTES);
  if (!Number.isFinite(minutes) || minutes <= 0) return DEFAULT_TIMING;
  const days = minutes / 1440;
  return { windowDays: days, windowCount: DEFAULT_TIMING.windowCount, referenceDays: days };
}

export function getFollowUpFlow(): FollowUpFlow {
  cache.somaFollowUp ??= createFollowUpFlow({
    followups: getFollowUpsRepository(),
    plans: getPlansRepository(),
    observations: getObservationsRepository(),
    notifications: getNotificationsRepository(),
    enqueue: (input) => getEcosystem().earth.enqueue(input),
    labelFor: (subjectId) => `Crew member ${subjectId}`,
    timing,
  });
  return cache.somaFollowUp;
}
