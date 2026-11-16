import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import type { Pool } from "pg";

import { createTestSchema, hasDirectDatabase } from "../../server/postgres.testing.ts";
import {
  createPostgresAlertsRepository,
  createPostgresAuditRepository,
} from "../alerts/alerts.repository.postgres.ts";
import { createAlertService } from "../alerts/alerts.service.ts";
import { verifyChain } from "../alerts/audit.logic.ts";
import { createPostgresNotificationsRepository } from "../notifications/notifications.repository.postgres.ts";
import { createPostgresObservationsRepository } from "../observation/observation.repository.postgres.ts";
import { createPostgresEvaluationsRepository } from "./evaluations.repository.postgres.ts";
import { createSentryService } from "./sentry.service.ts";

const START = 1_800_000_000_000 - (1_800_000_000_000 % 5000);

describe("sentry end to end on postgres", { skip: !hasDirectDatabase }, () => {
  let pool: Pool;
  let drop: () => Promise<void>;

  const build = () => {
    const alertsRepo = createPostgresAlertsRepository(pool);
    const audit = createPostgresAuditRepository(pool);
    const alerts = createAlertService({ alerts: alertsRepo, audit, enqueueToEarth: async () => undefined });
    const evaluations = createPostgresEvaluationsRepository(pool);
    const notifications = createPostgresNotificationsRepository(pool);
    const sentry = createSentryService({
      observations: createPostgresObservationsRepository(pool),
      evaluations,
      notifications,
      raiseAlert: (input) => alerts.raise(input),
      memberFor: (s) => s,
      labelFor: (m) => `Tripulante ${m}`,
    });
    return { alertsRepo, audit, evaluations, notifications, sentry };
  };

  before(async () => {
    ({ pool, drop } = await createTestSchema());
  });
  after(async () => {
    await drop();
  });

  it("turns simulated minutes into alerts, audit entries and notifications", { timeout: 240_000 }, async () => {
    const { alertsRepo, audit, evaluations, notifications, sentry } = build();
    for (let second = 40; second <= 10 * 60; second += 60) {
      await sentry.tick(START + second * 1000);
    }

    const alerts = await alertsRepo.list();
    const byMember = (id: string) => alerts.filter((a) => a.memberId === id).map((a) => a.level);
    assert.deepEqual(byMember("cm-02"), ["F2"]);
    assert.deepEqual(byMember("cm-03"), ["F3"]);
    assert.deepEqual(byMember("cm-01"), []);
    assert.deepEqual(byMember("cm-04"), []);

    const entries = await audit.list();
    assert.equal(entries.length, 2);
    assert.ok(entries.every((e) => e.actor.kind === "system" && e.actor.id === "sentry"));
    assert.ok(verifyChain(entries).valid);

    const cmo = await notifications.listFor({ role: "cmo" });
    assert.deepEqual(cmo.map((n) => n.payload.level).sort(), ["F2", "F3"]);
    const person = await notifications.listFor({ role: "astronaut", memberId: "cm-02" });
    assert.deepEqual(person.map((n) => n.payload.level).sort(), ["F2", "F3"]);
    const stranger = await notifications.listFor({ role: "astronaut", memberId: "cm-01" });
    assert.deepEqual(stranger.map((n) => n.payload.level), ["F3"]);
    const earth = await notifications.listFor({ role: "earth" });
    assert.deepEqual(earth.map((n) => n.payload.level), ["F3"]);
    assert.ok(cmo.every((n) => !JSON.stringify(n).includes("clinicalDetail")));

    const statuses = async (id: string) => (await evaluations.history(id)).map((e) => e.status).reverse();
    const cm02 = await statuses("cm-02");
    assert.ok(cm02.includes("F2") && !cm02.includes("F3") && cm02.at(-1) === "F0");
    const cm03 = await statuses("cm-03");
    assert.ok(cm03.includes("F3") && cm03.at(-1) === "F0");
    for (const calm of ["cm-01", "cm-04"]) {
      const history = await statuses(calm);
      assert.ok(history.every((status) => status === "F0" || status === "F1"));
    }
  });

  it("is idempotent when the same minutes are replayed", { timeout: 120_000 }, async () => {
    const { alertsRepo, audit, sentry } = build();
    const before = [(await alertsRepo.list()).length, (await audit.list()).length];
    for (const second of [460, 520, 580]) {
      await sentry.tick(START + second * 1000);
    }
    assert.deepEqual([(await alertsRepo.list()).length, (await audit.list()).length], before);
  });
});
