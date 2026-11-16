import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import type { Pool } from "pg";

import { createTestSchema, hasDirectDatabase } from "../../server/postgres.testing.ts";
import { createPostgresAuditRepository } from "../alerts/alerts.repository.postgres.ts";
import { createPostgresEarthRepository, seedEarthState } from "../earth/earth.repository.postgres.ts";
import { earthStateSchema } from "../earth/earth.schema.ts";
import { createEarthService } from "../earth/earth.service.ts";
import { createPostgresNotificationsRepository } from "../notifications/notifications.repository.postgres.ts";
import { createPostgresObservationsRepository } from "../observation/observation.repository.postgres.ts";
import { createPostgresPlansRepository } from "../plan/plan.repository.postgres.ts";
import { syntheticHeartRate } from "../sentry/sentry.simulation.ts";
import { createFollowUpFlow, type FollowUpFlow } from "./followup.flow.ts";
import { createPostgresFollowUpsRepository } from "./followup.repository.postgres.ts";

const T0 = 1_800_000_000_000 - (1_800_000_000_000 % 5000);
const sec = (s: number) => T0 + s * 1000;

describe("follow-up cycle with Earth on postgres", { skip: !hasDirectDatabase }, () => {
  let pool: Pool;
  let drop: () => Promise<void>;
  let flow: FollowUpFlow;
  let earth: ReturnType<typeof createEarthService>;
  const followups = () => createPostgresFollowUpsRepository(pool);
  const notifications = () => createPostgresNotificationsRepository(pool);

  before(async () => {
    ({ pool, drop } = await createTestSchema());
    const seed = earthStateSchema.parse(
      JSON.parse(await readFile(path.join(process.cwd(), "src", "features", "earth", "seed", "earth.json"), "utf-8")),
    );
    await seedEarthState(pool, seed);
    earth = createEarthService({
      repo: createPostgresEarthRepository(pool),
      audit: createPostgresAuditRepository(pool),
      onFlushed: async (state) => {
        await flow.reconcile(state);
      },
    });
    const observations = createPostgresObservationsRepository(pool);
    await observations.addMany(Array.from({ length: 60 }, (_, k) => syntheticHeartRate("cm-02", sec(k * 5), T0)));
    const plans = createPostgresPlansRepository(pool);
    const at = new Date(sec(100)).toISOString();
    await plans.add({
      id: "pl-1",
      subjectId: "cm-02",
      evaluationId: "ev-1",
      level: "F2",
      status: "approved",
      revision: 1,
      steps: ["Descansar"],
      uncertainty: "x",
      source: { provider: "ollama", mode: "live" },
      concerns: [],
      reviews: [],
      decided: { via: "earth", role: "earth", actorId: "demo-earth-md-01", at },
      createdAt: at,
      updatedAt: at,
    });
    flow = createFollowUpFlow({
      followups: followups(),
      plans,
      observations,
      notifications: notifications(),
      enqueue: (input) => earth.enqueue(input),
      labelFor: (id) => `Crew member ${id}`,
      timing: () => ({ windowDays: 60 / 86_400, windowCount: 2, referenceDays: 60 / 86_400 }),
    });
    await earth.setLink({ status: "connected", latencyMs: 40, ackLoss: false });
  });
  after(async () => {
    await drop();
  });

  it("reports closed windows to Earth, takes its feedback once and notifies", async () => {
    const created = await flow.sync(sec(110), { force: true });
    assert.equal(created.created, 1);
    assert.equal((await flow.sync(sec(165), { force: true })).reported, 1);
    await earth.flush({ force: true });

    const state = await earth.getState();
    const pending = await flow.awaitingFeedback(state);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].report.windowId, "w1");

    const sent = await flow.earthFeedback({
      followUpId: pending[0].followUpId,
      windowId: "w1",
      decision: "comment",
      note: "Measure at night",
      reviewerId: "demo-earth-md-01",
    });
    assert.ok(sent.ok);
    assert.equal((await followups().get(pending[0].followUpId))?.reports[0].feedback.length, 0);

    await earth.flush({ force: true });
    await earth.flush({ force: true });
    const record = await followups().get(pending[0].followUpId);
    assert.equal(record?.reports[0].feedback.length, 1);
    assert.equal(record?.reports[0].feedback[0].note, "Measure at night");
    assert.deepEqual(await flow.awaitingFeedback(await earth.getState()), []);

    const cmo = await notifications().listFor({ role: "cmo" }, { limit: 50 });
    assert.equal(cmo.filter((n) => n.kind === "earth_response").length, 1);
    const commander = await notifications().listFor({ role: "commander" }, { limit: 50 });
    assert.equal(commander.filter((n) => n.kind === "earth_response").length, 1);
  });

  it("holds the report back from Earth while the link is down and applies feedback later", async () => {
    await earth.setLink({ status: "disconnected", latencyMs: 40, ackLoss: false });
    assert.equal((await flow.sync(sec(290), { force: true })).reported, 1);
    await earth.flush({ force: true });
    assert.deepEqual((await flow.awaitingFeedback(await earth.getState())).map((p) => p.report.windowId), []);

    await earth.setLink({ status: "connected", latencyMs: 40, ackLoss: false });
    await earth.flush({ force: true });
    const pending = await flow.awaitingFeedback(await earth.getState());
    assert.deepEqual(pending.map((p) => p.report.windowId), ["w2"]);
    assert.equal((await followups().get(pending[0].followUpId))?.status, "closed");
  });
});
