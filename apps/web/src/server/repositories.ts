import "server-only";

import { createPostgresNotificationsRepository } from "../features/notifications/notifications.repository.postgres.ts";
import type { NotificationsRepository } from "../features/notifications/notifications.repository.ts";
import { createPostgresObservationsRepository } from "../features/observation/observation.repository.postgres.ts";
import type { ObservationsRepository } from "../features/observation/observation.repository.ts";
import { createPostgresEvaluationsRepository } from "../features/sentry/evaluations.repository.postgres.ts";
import type { EvaluationsRepository } from "../features/sentry/evaluations.repository.ts";
import { createPostgresPlansRepository } from "../features/plan/plan.repository.postgres.ts";
import type { PlansRepository } from "../features/plan/plan.repository.ts";
import { getPool } from "./db";

const cache = globalThis as unknown as {
  somaNotifications?: NotificationsRepository;
  somaObservations?: ObservationsRepository;
  somaEvaluations?: EvaluationsRepository;
  somaPlans?: PlansRepository;
};

export function getPlansRepository(): PlansRepository {
  cache.somaPlans ??= createPostgresPlansRepository(getPool());
  return cache.somaPlans;
}

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
