import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { err, ok } from "../../shared/result.ts";
import type { EarthState, NewPacket, Packet } from "../earth/earth.types.ts";
import type { NewNotification } from "../notifications/notifications.types.ts";
import type { ObservationsRepository } from "../observation/observation.repository.ts";
import type { Observation } from "../observation/observation.types.ts";
import type { PlanRecord } from "../plan/plan.record.ts";
import type { PlansRepository } from "../plan/plan.repository.ts";
import { syntheticHeartRate } from "../sentry/sentry.simulation.ts";
import { createFollowUpFlow } from "./followup.flow.ts";
import type { FollowUpRecord } from "./followup.record.ts";
import type { FollowUpsRepository } from "./followup.repository.ts";

const T0 = 1_800_000_000_000 - (1_800_000_000_000 % 5000);
const sec = (s: number) => T0 + s * 1000;
const approvedAt = new Date(sec(100)).toISOString();

const plan = (over: Partial<PlanRecord> = {}): PlanRecord => ({
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
  decided: { via: "earth", role: "earth", actorId: "demo-earth-md-01", at: approvedAt },
  createdAt: approvedAt,
  updatedAt: approvedAt,
  ...over,
});

function setup(options: { plans?: PlanRecord[]; blocks?: number } = {}) {
  const blocks = options.blocks ?? 60;
  const all: Observation[] = Array.from({ length: blocks }, (_, k) => syntheticHeartRate("cm-02", sec(k * 5), T0));
  const observations: ObservationsRepository = {
    add: async (o) => ({ observation: o, duplicate: false }),
    addMany: async (list) => ({ stored: list.length, duplicates: 0 }),
    listBySubject: async (subject, opts = {}) => {
      let rows = all.filter((o) => o.subjectId === subject);
      if (opts.since) rows = rows.filter((o) => o.observedAt >= opts.since!);
      return opts.newest ? rows.slice(-(opts.limit ?? 500)) : rows.slice(0, opts.limit ?? 500);
    },
  };
  const rows: FollowUpRecord[] = [];
  const followups: FollowUpsRepository = {
    add: async (record) => {
      const found = rows.find((r) => r.planId === record.planId);
      if (found) return { record: found, duplicate: true };
      rows.push(record);
      return { record, duplicate: false };
    },
    get: async (id) => rows.find((r) => r.id === id) ?? null,
    getByPlan: async (id) => rows.find((r) => r.planId === id) ?? null,
    latestForSubject: async (s) => rows.filter((r) => r.subjectId === s).at(-1) ?? null,
    listActive: async () => rows.filter((r) => r.status === "active"),
    listRecent: async () => [...rows].reverse(),
    update: async (id, fn) => {
      const index = rows.findIndex((r) => r.id === id);
      if (index < 0) return err("no");
      const result = fn(rows[index]);
      if (result.ok) rows[index] = result.value;
      return result;
    },
  };
  const plans: PlansRepository = {
    add: async (p) => ({ plan: p, duplicate: false }),
    get: async () => null,
    latestForSubject: async () => null,
    activeForSubject: async () => null,
    list: async (opts = {}) => (options.plans ?? [plan()]).filter((p) => !opts.statuses || opts.statuses.includes(p.status)),
    update: async (_id, fn) => ok(fn(plan()).ok ? plan() : plan()),
  };
  const notes: NewNotification[] = [];
  const packets: Omit<NewPacket, "id">[] = [];
  const flow = createFollowUpFlow({
    followups,
    plans,
    observations,
    notifications: {
      add: async (input) => {
        if (!notes.some((n) => n.dedupeKey === input.dedupeKey)) notes.push(input);
        return { notification: {} as never, duplicate: false };
      },
      listFor: async () => [],
      markRead: async () => true,
      latestOfKind: async () => null,
    },
    enqueue: async (input) => {
      if (!packets.some((p) => p.idempotencyKey === input.idempotencyKey)) packets.push(input);
    },
    labelFor: (s) => `Crew member ${s}`,
    timing: () => ({ windowDays: 60 / 86_400, windowCount: 3, referenceDays: 60 / 86_400 }),
    makeId: () => "x1",
  });
  return { flow, rows, notes, packets };
}

describe("follow-up flow", () => {
  it("creates the contract from an approved plan and tells the CMO once", async () => {
    const { flow, rows, notes } = setup();
    const first = await flow.sync(sec(110), { force: true });
    assert.equal(first.created, 1);
    assert.equal(rows[0].contract.planStartedAt, approvedAt);
    assert.equal(rows[0].contract.windows.length, 3);
    assert.deepEqual(rows[0].contract.targets, [{ signal: "heartRate", expectedDirection: "decrease" }]);
    assert.equal(notes[0].title, "Follow-up started");
    assert.deepEqual(notes[0].audience, ["role:cmo"]);
    assert.equal((await flow.sync(sec(111), { force: true })).created, 0);
    assert.equal(rows.length, 1);
  });

  it("does not create a contract for a plan that is not approved", async () => {
    const { flow, rows } = setup({ plans: [plan({ status: "in_review", decided: undefined })] });
    assert.equal((await flow.sync(sec(110), { force: true })).created, 0);
    assert.equal(rows.length, 0);
  });

  it("waits when the subject has no usable baseline", async () => {
    const { flow, rows } = setup({ blocks: 4 });
    assert.equal((await flow.sync(sec(110), { force: true })).created, 0);
    assert.equal(rows.length, 0);
  });

  it("closes windows on the clock, one report per window, and sends each to Earth", async () => {
    const { flow, rows, packets, notes } = setup();
    await flow.sync(sec(110), { force: true });
    assert.equal((await flow.sync(sec(150), { force: true })).reported, 0);

    assert.equal((await flow.sync(sec(165), { force: true })).reported, 1);
    assert.deepEqual(rows[0].reports.map((r) => r.windowId), ["w1"]);
    assert.equal(rows[0].status, "active");
    assert.equal(packets[0].kind, "followup_report");
    assert.equal(packets[0].direction, "to_earth");
    assert.equal(packets[0].idempotencyKey, "followup-report:fu-x1:w1");
    assert.equal(packets[0].payload.windowId, "w1");

    assert.equal((await flow.sync(sec(165), { force: true })).reported, 0);
    assert.equal(packets.length, 1);

    assert.equal((await flow.sync(sec(290), { force: true })).reported, 2);
    assert.deepEqual(rows[0].reports.map((r) => r.windowId), ["w1", "w2", "w3"]);
    assert.equal(rows[0].status, "closed");
    assert.equal(notes.at(-1)?.title, "Follow-up complete");
    assert.equal((await flow.sync(sec(400), { force: true })).reported, 0);
  });

  it("reports honestly that adherence is missing instead of inventing a trend", async () => {
    const { flow, rows, notes } = setup();
    await flow.sync(sec(110), { force: true });
    await flow.sync(sec(165), { force: true });
    assert.equal(rows[0].reports[0].status, "not-evaluable");
    assert.ok(rows[0].reports[0].reasons.includes("adherence-missing"));
    assert.equal(rows[0].reports[0].escalate, false);
    const window = notes.find((n) => n.title === "Window 1 closed");
    assert.ok(window?.body?.startsWith("Crew member cm-02: Not evaluable. "));
    assert.ok((window?.body?.length ?? 0) > "Crew member cm-02: Not evaluable. ".length);
    assert.deepEqual(window?.audience, ["role:cmo"]);
  });

  it("throttles repeated runs unless forced", async () => {
    const { flow } = setup();
    await flow.sync(sec(110));
    assert.equal((await flow.sync(sec(115))).skipped, true);
    assert.equal((await flow.sync(sec(150))).skipped, false);
  });
});

describe("follow-up feedback from Earth", () => {
  const stateOf = (packets: Omit<NewPacket, "id">[], delivered: string[]): EarthState =>
    ({
      queue: packets.map((p, i) => ({
        ...p,
        id: `pk-${i}`,
        seq: i + 1,
        status: delivered.includes(p.idempotencyKey) ? "acked" : "queued",
      })) as Packet[],
      inbox: [],
      proposals: [],
      nextSeq: packets.length + 1,
    }) as unknown as EarthState;

  async function withClosedWindow() {
    const ctx = setup();
    await ctx.flow.sync(sec(110), { force: true });
    await ctx.flow.sync(sec(165), { force: true });
    return { ...ctx, followUpId: ctx.rows[0].id, reportKey: ctx.packets[0].idempotencyKey };
  }

  it("shows Earth only the reports that were delivered and are still unanswered", async () => {
    const { flow, packets, reportKey, followUpId } = await withClosedWindow();
    assert.deepEqual(await flow.awaitingFeedback(stateOf(packets, [])), []);
    const pending = await flow.awaitingFeedback(stateOf(packets, [reportKey]));
    assert.deepEqual(pending.map((p) => [p.followUpId, p.report.windowId]), [[followUpId, "w1"]]);
  });

  it("queues a feedback packet to the station and validates the request", async () => {
    const { flow, packets, followUpId } = await withClosedWindow();
    const base = { followUpId, windowId: "w1", reviewerId: "demo-earth-md-01" };
    assert.equal((await flow.earthFeedback({ ...base, followUpId: "nope", decision: "ack", note: "" })).ok, false);
    assert.equal((await flow.earthFeedback({ ...base, windowId: "w3", decision: "ack", note: "" })).ok, false);
    assert.equal((await flow.earthFeedback({ ...base, decision: "comment", note: "  " })).ok, false);
    const sent = await flow.earthFeedback({ ...base, decision: "comment", note: "Measure at night" });
    assert.ok(sent.ok);
    const packet = packets.at(-1)!;
    assert.equal(packet.kind, "followup_feedback");
    assert.equal(packet.direction, "to_station");
    assert.equal(packet.payload.note, "Measure at night");
  });

  it("applies feedback only after delivery, once, and tells the CMO and the commander", async () => {
    const { flow, rows, packets, notes, reportKey, followUpId } = await withClosedWindow();
    await flow.earthFeedback({ followUpId, windowId: "w1", decision: "comment", note: "Measure at night", reviewerId: "demo-earth-md-01" });
    const feedbackKey = packets.at(-1)!.idempotencyKey;

    assert.equal(await flow.reconcile(stateOf(packets, [reportKey])), 0);
    assert.equal(rows[0].reports[0].feedback.length, 0);

    const delivered = stateOf(packets, [reportKey, feedbackKey]);
    assert.equal(await flow.reconcile(delivered), 1);
    assert.equal(await flow.reconcile(delivered), 0);
    assert.equal(rows[0].reports[0].feedback.length, 1);
    assert.equal(rows[0].reports[0].feedback[0].note, "Measure at night");

    const notice = notes.find((n) => n.title === "Earth responded");
    assert.equal(notice?.body, "Crew member cm-02: Window 1 · commented");
    assert.deepEqual(notice?.audience, ["role:cmo", "role:commander"]);
    assert.deepEqual(await flow.awaitingFeedback(delivered), []);
  });
});
