import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { err, ok } from "../../shared/result.ts";
import type { AuditEntry } from "../alerts/alerts.types.ts";
import { appendEntry, verifyChain } from "../alerts/audit.logic.ts";
import type { EarthState, NewPacket, Packet } from "../earth/earth.types.ts";
import type { NewNotification } from "../notifications/notifications.types.ts";
import type { StoredEvaluation } from "../sentry/evaluations.repository.ts";
import { createPlanFlow } from "./plan.flow.ts";
import type { PlanRecord } from "./plan.record.ts";
import type { PlansRepository } from "./plan.repository.ts";

const NOW = "2026-11-16T12:00:00.000Z";

function memoryPlans(): PlansRepository & { rows: PlanRecord[] } {
  const rows: PlanRecord[] = [];
  return {
    rows,
    add: async (plan) => {
      const found = rows.find((p) => p.evaluationId === plan.evaluationId);
      if (found) return { plan: found, duplicate: true };
      rows.push(plan);
      return { plan, duplicate: false };
    },
    get: async (id) => rows.find((p) => p.id === id) ?? null,
    latestForSubject: async (s) => rows.filter((p) => p.subjectId === s).at(-1) ?? null,
    activeForSubject: async (s) =>
      rows.find((p) => p.subjectId === s && p.status !== "approved") ?? null,
    list: async (options = {}) => rows.filter((p) => !options.statuses || options.statuses.includes(p.status)),
    update: async (id, fn) => {
      const index = rows.findIndex((p) => p.id === id);
      if (index < 0) return err("Plan no encontrado.");
      const result = fn(rows[index]);
      if (result.ok) rows[index] = result.value;
      return result;
    },
  };
}

function setup(link: "connected" | "disconnected" = "connected", failDraft = false) {
  const plans = memoryPlans();
  const entries: AuditEntry[] = [];
  const notes: NewNotification[] = [];
  const queue: Packet[] = [];
  let seq = 0;
  let linkState = link;
  const flow = createPlanFlow({
    plans,
    audit: {
      list: async () => entries,
      append: async (input) => {
        const result = appendEntry(entries, input, { id: `au-${entries.length + 1}`, at: NOW });
        if (!result.duplicate) entries.push(result.entry);
        return { entry: result.entry, duplicate: result.duplicate };
      },
    },
    notifications: {
      add: async (input) => {
        notes.push(input);
        return { notification: {} as never, duplicate: false };
      },
      listFor: async () => [],
      markRead: async () => true,
      latestOfKind: async () => null,
    },
    draft: async (evaluation) =>
      failDraft
        ? err("sin fuente")
        : evaluation.status === "F3"
        ? ok({ steps: ["Protocolo A"], uncertainty: "Protocolo", source: { provider: "protocolos aprobados", mode: "live" } })
        : ok({ steps: ["Paso 1", "Paso 2", "Paso 3"], uncertainty: "Sin validar", source: { provider: "ollama", mode: "live" } }),
    enqueue: async (input: Omit<NewPacket, "id">) => {
      const existing = queue.find((p) => p.idempotencyKey === input.idempotencyKey);
      if (existing) return { packet: existing, duplicate: true };
      const packet: Packet = {
        ...input,
        id: `pk-${++seq}`,
        seq,
        createdAt: NOW,
        status: "queued",
        attempts: 0,
        nextAttemptAt: NOW,
      };
      queue.push(packet);
      return { packet, duplicate: false };
    },
    linkStatus: async () => linkState,
    labelFor: (s) => `Tripulante ${s}`,
    now: () => NOW,
    makeId: (() => {
      let n = 0;
      return () => `id${++n}`;
    })(),
  });
  const state = (): EarthState =>
    ({ queue, inbox: queue.filter((p) => p.status === "acked").map((p) => ({ idempotencyKey: p.idempotencyKey, packetId: p.id, direction: p.direction, receivedAt: NOW })), proposals: [], nextSeq: seq + 1 }) as unknown as EarthState;
  const deliver = (key: string) => {
    const packet = queue.find((p) => p.idempotencyKey === key)!;
    packet.status = "acked";
  };
  return { flow, plans, entries, notes, queue, state, deliver, setLink: (l: "connected" | "disconnected") => (linkState = l) };
}

const evaluation = (status: StoredEvaluation["status"], id = "ev-1"): StoredEvaluation => ({
  id,
  status,
  subjectId: "cm-02",
  evaluatedAt: NOW,
  ruleSetVersion: "v",
  engineVersion: "e",
  triggeredRules: ["hr-high-persistent"],
  evidence: [],
  limitations: [],
});

const cmo = { role: "cmo" as const, actorId: "demo-cmo-01" };

describe("plan flow", () => {
  it("drafts a plan from F2 and F3 only, once per active plan", async () => {
    const { flow, plans, entries, notes } = setup();
    assert.equal(await flow.onEvaluationSaved(evaluation("F1")), null);
    const plan = await flow.onEvaluationSaved(evaluation("F2"));
    assert.equal(plan?.status, "draft");
    assert.equal(plans.rows.length, 1);
    assert.equal(await flow.onEvaluationSaved(evaluation("F3", "ev-2")), null);
    assert.equal(entries[0].action, "plan_drafted");
    assert.deepEqual(entries[0].actor, { kind: "system", id: "sentry" });
    assert.deepEqual(notes[0].audience, ["role:cmo"]);
    assert.ok(verifyChain(entries).valid);
  });

  it("does not create a plan when drafting fails", async () => {
    const { flow, plans } = setup("connected", true);
    assert.equal(await flow.onEvaluationSaved(evaluation("F2")), null);
    assert.equal(plans.rows.length, 0);
  });

  it("submits to Earth with a queued request packet and an audit entry", async () => {
    const { flow, plans, queue, entries } = setup();
    const plan = (await flow.onEvaluationSaved(evaluation("F2")))!;
    const sent = await flow.submit({ planId: plan.id, actor: cmo });
    assert.ok(sent.ok && sent.value.status === "in_review");
    assert.equal(queue[0].kind, "plan_review_request");
    assert.equal(queue[0].direction, "to_earth");
    assert.equal(queue[0].idempotencyKey, `plan-review-request:${plan.id}:1`);
    assert.equal(entries.at(-1)?.action, "plan_submitted");
    assert.equal((await flow.submit({ planId: plan.id, actor: cmo })).ok, false);
    assert.equal(queue.length, 1);
    assert.equal(plans.rows[0].status, "in_review");
  });

  it("shows Earth only the requests that were delivered", async () => {
    const { flow, queue, deliver, state } = setup();
    const plan = (await flow.onEvaluationSaved(evaluation("F2")))!;
    await flow.submit({ planId: plan.id, actor: cmo });
    assert.deepEqual(await flow.awaitingEarth(state()), []);
    deliver(queue[0].idempotencyKey);
    assert.deepEqual((await flow.awaitingEarth(state())).map((p) => p.id), [plan.id]);
  });

  it("applies the Earth response only after delivery, once, and notifies", async () => {
    const { flow, plans, queue, deliver, state, notes, entries } = setup();
    const plan = (await flow.onEvaluationSaved(evaluation("F2")))!;
    await flow.submit({ planId: plan.id, actor: cmo });
    deliver(queue[0].idempotencyKey);

    const reply = await flow.earthRespond({ planId: plan.id, decision: "approve", note: "", reviewerId: "demo-earth-md-01" });
    assert.ok(reply.ok);
    assert.equal(queue[1].direction, "to_station");
    assert.equal(await flow.reconcile(state()), 0);
    assert.equal(plans.rows[0].status, "in_review");

    deliver(queue[1].idempotencyKey);
    assert.equal(await flow.reconcile(state()), 1);
    assert.equal(plans.rows[0].status, "approved");
    assert.equal(await flow.reconcile(state()), 0);

    const earthNote = notes.find((n) => n.kind === "earth_response");
    assert.equal(earthNote?.title, "Tierra respondió");
    assert.equal(earthNote?.body, "Tripulante cm-02: aprobó el plan");
    assert.deepEqual(earthNote?.audience, ["role:cmo", "role:commander"]);
    const review = entries.find((e) => e.action === "plan_review");
    assert.deepEqual(review?.actor, { kind: "human", id: "demo-earth-md-01", role: "earth" });
    assert.ok(verifyChain(entries).valid);
  });

  it("returns a plan to the board on changes and allows a new revision", async () => {
    const { flow, plans, queue, deliver, state } = setup();
    const plan = (await flow.onEvaluationSaved(evaluation("F2")))!;
    await flow.submit({ planId: plan.id, actor: cmo });
    deliver(queue[0].idempotencyKey);
    await flow.earthRespond({ planId: plan.id, decision: "changes", note: "Falta hidratación", steps: ["Hidratar", "Descansar"], reviewerId: "demo-earth-md-01" });
    deliver(queue[1].idempotencyKey);
    await flow.reconcile(state());
    assert.equal(plans.rows[0].status, "changes_requested");
    assert.deepEqual(plans.rows[0].steps, ["Hidratar", "Descansar"]);
    const again = await flow.submit({ planId: plan.id, actor: cmo });
    assert.ok(again.ok && again.value.revision === 2);
    assert.equal(queue[2].idempotencyKey, `plan-review-request:${plan.id}:2`);
  });

  it("keeps comments from changing the status and requires a note for them", async () => {
    const { flow, plans, queue, deliver, state } = setup();
    const plan = (await flow.onEvaluationSaved(evaluation("F2")))!;
    await flow.submit({ planId: plan.id, actor: cmo });
    deliver(queue[0].idempotencyKey);
    assert.equal((await flow.earthRespond({ planId: plan.id, decision: "comment", note: " ", reviewerId: "e" })).ok, false);
    await flow.earthRespond({ planId: plan.id, decision: "comment", note: "Revisar dosis", reviewerId: "e" });
    deliver(queue[1].idempotencyKey);
    await flow.reconcile(state());
    assert.equal(plans.rows[0].status, "in_review");
    assert.equal(plans.rows[0].reviews.length, 1);
  });

  it("lets the board approve only when the link is down", async () => {
    const { flow, plans, entries, setLink } = setup("connected");
    const plan = (await flow.onEvaluationSaved(evaluation("F3")))!;
    assert.equal((await flow.approveBoard({ planId: plan.id, actor: cmo })).ok, false);
    setLink("disconnected");
    const done = await flow.approveBoard({ planId: plan.id, actor: cmo });
    assert.ok(done.ok && done.value.decided?.via === "board");
    assert.equal(plans.rows[0].status, "approved");
    assert.deepEqual(entries.at(-1)?.actor, { kind: "human", id: "demo-cmo-01", role: "cmo" });
  });

  it("refuses an Earth response for a plan that is not in review", async () => {
    const { flow } = setup();
    const plan = (await flow.onEvaluationSaved(evaluation("F2")))!;
    assert.equal((await flow.earthRespond({ planId: plan.id, decision: "approve", note: "", reviewerId: "e" })).ok, false);
    assert.equal((await flow.earthRespond({ planId: "nope", decision: "approve", note: "", reviewerId: "e" })).ok, false);
  });
});
