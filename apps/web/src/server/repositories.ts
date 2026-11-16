import "server-only";

import { createPostgresNotificationsRepository } from "../features/notifications/notifications.repository.postgres.ts";
import type { NotificationsRepository } from "../features/notifications/notifications.repository.ts";
import { createPostgresObservationsRepository } from "../features/observation/observation.repository.postgres.ts";
import type { ObservationsRepository } from "../features/observation/observation.repository.ts";
import { createPostgresEvaluationsRepository } from "../features/sentry/evaluations.repository.postgres.ts";
import type { EvaluationsRepository } from "../features/sentry/evaluations.repository.ts";
import { getPool } from "./db";

const cache = globalThis as unknown as {
  somaNotifications?: NotificationsRepository;
  somaObservations?: ObservationsRepository;
  somaEvaluations?: EvaluationsRepository;
};

export function getEvaluationsRepository(): EvaluationsRepository {
  cache.somaEvaluations ??= createPostgresEvaluationsRepository(getPool());
  return cache.somaEvaluations;
}

export function getNotificationsRepository(): NotificationsRepository {
  cache.somaNotifications ??= createPostgresNotificationsRepository(getPool());
  return cache.somaNotifications;
}

export function getObservationsRepository(): ObservationsRepository {
  cache.somaObservations ??= createPostgresObservationsRepository(getPool());
  return cache.somaObservations;
}
