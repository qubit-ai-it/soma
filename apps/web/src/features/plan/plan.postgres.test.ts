import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import type { Pool } from "pg";

import { ok } from "../../shared/result.ts";
import { createTestSchema, hasDirectDatabase } from "../../server/postgres.testing.ts";
import { createPostgresAuditRepository } from "../alerts/alerts.repository.postgres.ts";
import { verifyChain } from "../alerts/audit.logic.ts";
import { createPostgresEarthRepository, seedEarthState } from "../earth/earth.repository.postgres.ts";
import { earthStateSchema } from "../earth/earth.schema.ts";
import { createEarthService } from "../earth/earth.service.ts";
import { createPostgresNotificationsRepository } from "../notifications/notifications.repository.postgres.ts";
import type { StoredEvaluation } from "../sentry/evaluations.repository.ts";
import { createPlanFlow, type PlanFlow } from "./plan.flow.ts";
import { createPostgresPlansRepository } from "./plan.repository.postgres.ts";

const cmo = { role: "cmo" as const, actorId: "demo-cmo-01" };
const evaluation = (id: string, subjectId: string): StoredEvaluation => ({
  id,
  status: "F2",
  subjectId,
  evaluatedAt: "2026-11-16T12:00:00.000Z",
  ruleSetVersion: "v",
  engineVersion: "e",
  triggeredRules: ["hr-high-persistent"],
  evidence: [],
  limitations: [],
});

describe("plan review cycle on postgres", { skip: !hasDirectDatabase }, () => {
  let pool: Pool;
  let drop: () => Promise<void>;
  let flow: PlanFlow;
  let earth: ReturnType<typeof createEarthService>;
  const audit = () => createPostgresAuditRepository(pool);
  const notifications = () => createPostgresNotificationsRepository(pool);
  const plans = () => createPostgresPlansRepository(pool);

  before(async () => {
    ({ pool, drop } = await createTestSchema());
    const seed = earthStateSchema.parse(
      JSON.parse(await readFile(path.join(process.cwd(), "src", "features", "earth", "seed", "earth.json"), "utf-8")),
    );
    await seedEarthState(pool, seed);
    earth = createEarthService({
      repo: createPostgresEarthRepository(pool),
      audit: audit(),
      onFlushed: async (state) => {
        await flow.reconcile(state);
      },
    });
    flow = createPlanFlow({
      plans: plans(),
      audit: audit(),
      notifications: notifications(),
      draft: async () => ok({ steps: ["Hidratar", "Descansar", "Medir de nuevo"], uncertainty: "Borrador", source: { provider: "ollama", mode: "live" } }),
      enqueue: (input) => earth.enqueue(input),
      linkStatus: async () => (await earth.getState()).link.status,
      labelFor: (id) => `Tripulante ${id}`,
    });
    await earth.setLink({ status: "connected", latencyMs: 40, ackLoss: false });
  });
  after(async () => {
    await drop();
  });

  it("runs draft, board submit, Earth approval and Sentry notice with a link", async () => {
    const plan = (await flow.onEvaluationSaved(evaluation("ev-a", "cm-02")))!;
    assert.equal(plan.status, "draft");
    assert.equal((await notifications().listFor({ role: "cmo" })).filter((n) => n.kind === "plan").length, 1);

    assert.ok((await flow.submit({ planId: plan.id, actor: cmo })).ok);
    await earth.flush({ force: true });
    assert.deepEqual((await flow.awaitingEarth(await earth.getState())).map((p) => p.id), [plan.id]);

    assert.ok((await flow.earthRespond({ planId: plan.id, decision: "approve", note: "", reviewerId: "demo-earth-md-01" })).ok);
    assert.equal((await plans().get(plan.id))?.status, "in_review");
    await earth.flush({ force: true });

    const done = await plans().get(plan.id);
    assert.equal(done?.status, "approved");
    assert.equal(done?.decided?.via, "earth");
    const notice = (await notifications().listFor({ role: "cmo" })).find((n) => n.kind === "earth_response");
    assert.equal(notice?.title, "Tierra respondió");
    assert.deepEqual((await flow.awaitingEarth(await earth.getState())).map((p) => p.id), []);

    const entries = await audit().list();
    assert.deepEqual(
      entries.map((e) => e.action),
      ["plan_drafted", "plan_submitted", "plan_review"],
    );
    assert.ok(verifyChain(entries).valid);
  });

  it("applies an Earth response only when the link returns, and only once", async () => {
    const plan = (await flow.onEvaluationSaved(evaluation("ev-b", "cm-03")))!;
    await flow.submit({ planId: plan.id, actor: cmo });
    await earth.flush({ force: true });
    await flow.earthRespond({ planId: plan.id, decision: "changes", note: "Falta hidratación", steps: ["Hidratar mucho", "Descansar"], reviewerId: "demo-earth-md-01" });

    await earth.setLink({ status: "disconnected", latencyMs: 40, ackLoss: false });
    await earth.flush({ force: true });
    assert.equal((await plans().get(plan.id))?.status, "in_review");

    await earth.setLink({ status: "connected", latencyMs: 40, ackLoss: false });
    await earth.flush({ force: true });
    await earth.flush({ force: true });
    const back = await plans().get(plan.id);
    assert.equal(back?.status, "changes_requested");
    assert.deepEqual(back?.steps, ["Hidratar mucho", "Descansar"]);
    assert.equal(back?.reviews.length, 1);
    const notices = (await notifications().listFor({ role: "commander" })).filter((n) => n.kind === "earth_response");
    assert.equal(notices.length, 2);
  });

  it("keeps the request queued without a link and lets the board decide", async () => {
    await earth.setLink({ status: "disconnected", latencyMs: 40, ackLoss: false });
    const plan = (await flow.onEvaluationSaved(evaluation("ev-c", "cm-04")))!;
    assert.equal((await flow.submit({ planId: plan.id, actor: cmo })).ok, true);
    await earth.flush({ force: true });
    assert.deepEqual((await flow.awaitingEarth(await earth.getState())).map((p) => p.id), []);

    const approved = await flow.approveBoard({ planId: plan.id, actor: cmo });
    assert.ok(approved.ok && approved.value.decided?.via === "board");
    const last = (await audit().list()).at(-1);
    assert.deepEqual(last?.actor, { kind: "human", id: "demo-cmo-01", role: "cmo" });
    assert.ok(verifyChain(await audit().list()).valid);
  });

  it("does not let the board approve while the link is up", async () => {
    await earth.setLink({ status: "connected", latencyMs: 40, ackLoss: false });
    const plan = (await flow.onEvaluationSaved(evaluation("ev-d", "cm-01")))!;
    const refused = await flow.approveBoard({ planId: plan.id, actor: cmo });
    assert.equal(refused.ok, false);
    assert.equal((await plans().get(plan.id))?.status, "draft");
  });
});
