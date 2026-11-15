import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_ATTEMPTS,
  applyReview,
  backoffMs,
  enqueuePacket,
  processQueue,
  setLink,
} from "./earth.logic.ts";
import type { EarthState, NewPacket } from "./earth.types.ts";

const T0 = "2026-10-31T06:00:00.000Z";
const at = (seconds: number) => new Date(Date.parse(T0) + seconds * 1000).toISOString();

function baseState(overrides: Partial<EarthState> = {}): EarthState {
  return {
    link: { status: "connected", latencyMs: 600, ackLoss: false, updatedAt: T0 },
    nextSeq: 1,
    queue: [],
    inbox: [],
    proposals: [
      {
        id: "pp-1",
        subject: { memberId: "cm-02", label: "Tripulante cm-02 (sintético)" },
        title: "Plan de descanso",
        steps: ["Dormir 8 h", "Hidratar"],
        source: { provider: "simulated-medgemma", version: "sim-1" },
        createdAt: T0,
      },
    ],
    ...overrides,
  };
}

const packet = (n: number, key = `k-${n}`): NewPacket => ({
  id: `p-${n}`,
  idempotencyKey: key,
  kind: "event",
  direction: "to_earth",
  payload: { n },
});

describe("backoffMs", () => {
  it("doubles from the base and caps", () => {
    assert.equal(backoffMs(1), 2000);
    assert.equal(backoffMs(2), 4000);
    assert.equal(backoffMs(3), 8000);
    assert.equal(backoffMs(20), 60000);
  });

  it("is deterministic", () => {
    assert.equal(backoffMs(4), backoffMs(4));
  });

  it("treats zero or negative attempts as the first delay", () => {
    assert.equal(backoffMs(0), 2000);
  });
});

describe("enqueuePacket", () => {
  it("appends a queued packet with an increasing sequence number", () => {
    let state = baseState();
    state = enqueuePacket(state, packet(1), T0).state;
    state = enqueuePacket(state, packet(2), T0).state;
    assert.deepEqual(
      state.queue.map((p) => [p.seq, p.status, p.attempts]),
      [
        [1, "queued", 0],
        [2, "queued", 0],
      ],
    );
    assert.equal(state.nextSeq, 3);
    assert.equal(state.queue[0]?.nextAttemptAt, T0);
  });

  it("ignores a second packet with the same idempotency key", () => {
    const first = enqueuePacket(baseState(), packet(1, "same"), T0);
    const second = enqueuePacket(first.state, packet(2, "same"), T0);
    assert.equal(second.duplicate, true);
    assert.equal(second.state.queue.length, 1);
    assert.equal(second.packet.id, "p-1");
    assert.equal(second.state.nextSeq, 2);
  });
});

describe("processQueue", () => {
  it("delivers and acknowledges in order when the link is up", () => {
    let state = baseState();
    state = enqueuePacket(state, packet(1), T0).state;
    state = enqueuePacket(state, packet(2), T0).state;
    const result = processQueue(state, T0);
    assert.deepEqual(
      result.deliveries.map((d) => [d.packet.id, d.duplicate]),
      [
        ["p-1", false],
        ["p-2", false],
      ],
    );
    assert.ok(result.state.queue.every((p) => p.status === "acked" && p.attempts === 1));
    assert.equal(result.state.queue[0]?.ackedAt, new Date(Date.parse(T0) + 600).toISOString());
    assert.deepEqual(
      result.state.inbox.map((r) => r.idempotencyKey),
      ["k-1", "k-2"],
    );
  });

  it("does not deliver while the link is down and schedules a retry", () => {
    let state = baseState({ link: { status: "disconnected", latencyMs: 600, ackLoss: false, updatedAt: T0 } });
    state = enqueuePacket(state, packet(1), T0).state;
    const result = processQueue(state, T0);
    assert.equal(result.deliveries.length, 0);
    const queued = result.state.queue[0]!;
    assert.equal(queued.status, "queued");
    assert.equal(queued.attempts, 1);
    assert.equal(queued.lastError, "link_down");
    assert.equal(queued.nextAttemptAt, at(2));
    assert.equal(result.state.inbox.length, 0);
  });

  it("skips packets that are not yet due", () => {
    let state = baseState({ link: { status: "disconnected", latencyMs: 0, ackLoss: false, updatedAt: T0 } });
    state = enqueuePacket(state, packet(1), T0).state;
    state = processQueue(state, T0).state;
    state = setLink(state, { status: "connected" }, at(1));
    const early = processQueue(state, at(1));
    assert.equal(early.deliveries.length, 0);
    assert.equal(early.state.queue[0]?.attempts, 1);
  });

  it("delivers after the link comes back once the backoff has elapsed", () => {
    let state = baseState({ link: { status: "disconnected", latencyMs: 0, ackLoss: false, updatedAt: T0 } });
    state = enqueuePacket(state, packet(1), T0).state;
    state = processQueue(state, T0).state;
    state = setLink(state, { status: "connected" }, at(1));
    const late = processQueue(state, at(2));
    assert.equal(late.deliveries.length, 1);
    assert.equal(late.state.queue[0]?.status, "acked");
    assert.equal(late.state.queue[0]?.attempts, 2);
  });

  it("force ignores the backoff", () => {
    let state = baseState({ link: { status: "disconnected", latencyMs: 0, ackLoss: false, updatedAt: T0 } });
    state = enqueuePacket(state, packet(1), T0).state;
    state = processQueue(state, T0).state;
    state = setLink(state, { status: "connected" }, at(1));
    const forced = processQueue(state, at(1), { force: true });
    assert.equal(forced.deliveries.length, 1);
  });

  it("keeps queue order when later packets become due together", () => {
    let state = baseState({ link: { status: "disconnected", latencyMs: 0, ackLoss: false, updatedAt: T0 } });
    state = enqueuePacket(state, packet(1), T0).state;
    state = processQueue(state, T0).state;
    state = enqueuePacket(state, packet(2), at(1)).state;
    state = setLink(state, { status: "connected" }, at(2));
    const result = processQueue(state, at(2));
    assert.deepEqual(
      result.deliveries.map((d) => d.packet.id),
      ["p-1", "p-2"],
    );
  });

  it("marks a packet failed after the maximum number of attempts", () => {
    let state = baseState({ link: { status: "disconnected", latencyMs: 0, ackLoss: false, updatedAt: T0 } });
    state = enqueuePacket(state, packet(1), T0).state;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      state = processQueue(state, T0, { force: true }).state;
    }
    assert.equal(state.queue[0]?.status, "failed");
    assert.equal(state.queue[0]?.attempts, MAX_ATTEMPTS);
    const after = processQueue(setLink(state, { status: "connected" }, T0), T0, { force: true });
    assert.equal(after.deliveries.length, 0);
    assert.equal(after.state.queue[0]?.status, "failed");
  });

  it("does nothing on an empty queue and ignores acknowledged packets", () => {
    const empty = processQueue(baseState(), T0);
    assert.deepEqual(empty.deliveries, []);
    let state = enqueuePacket(baseState(), packet(1), T0).state;
    state = processQueue(state, T0).state;
    const again = processQueue(state, at(100), { force: true });
    assert.equal(again.deliveries.length, 0);
    assert.equal(again.state.queue[0]?.attempts, 1);
  });

  it("retries when the acknowledgement is lost and ignores the duplicate delivery", () => {
    let state = baseState({ link: { status: "connected", latencyMs: 0, ackLoss: true, updatedAt: T0 } });
    state = enqueuePacket(state, packet(1), T0).state;
    const first = processQueue(state, T0);
    assert.deepEqual(
      first.deliveries.map((d) => d.duplicate),
      [false],
    );
    assert.equal(first.state.queue[0]?.status, "queued");
    assert.equal(first.state.queue[0]?.lastError, "ack_lost");
    assert.equal(first.state.inbox.length, 1);

    const second = processQueue(first.state, at(2));
    assert.deepEqual(
      second.deliveries.map((d) => d.duplicate),
      [true],
    );
    assert.equal(second.state.inbox.length, 1);

    const healed = processQueue(setLink(second.state, { ackLoss: false }, at(3)), at(10));
    assert.deepEqual(
      healed.deliveries.map((d) => d.duplicate),
      [true],
    );
    assert.equal(healed.state.queue[0]?.status, "acked");
    assert.equal(healed.state.inbox.length, 1);
  });

  it("treats two distinct packets with the same key as one logical delivery", () => {
    const state = baseState({
      queue: [
        {
          id: "x1",
          seq: 1,
          idempotencyKey: "dup",
          kind: "event",
          direction: "to_earth",
          payload: {},
          createdAt: T0,
          status: "queued",
          attempts: 0,
          nextAttemptAt: T0,
        },
        {
          id: "x2",
          seq: 2,
          idempotencyKey: "dup",
          kind: "event",
          direction: "to_earth",
          payload: {},
          createdAt: T0,
          status: "queued",
          attempts: 0,
          nextAttemptAt: T0,
        },
      ],
      nextSeq: 3,
    });
    const result = processQueue(state, T0);
    assert.deepEqual(
      result.deliveries.map((d) => d.duplicate),
      [false, true],
    );
    assert.equal(result.state.inbox.length, 1);
  });
});

describe("setLink", () => {
  it("patches only the given fields and stamps the update", () => {
    const next = setLink(baseState(), { status: "disconnected" }, at(5));
    assert.equal(next.link.status, "disconnected");
    assert.equal(next.link.latencyMs, 600);
    assert.equal(next.link.updatedAt, at(5));
  });
});

describe("applyReview", () => {
  const base = { proposalId: "pp-1", actorId: "demo-earth-md-01", packetId: "p-r1", now: T0 };

  it("approve records the review and queues a response packet to the station", () => {
    const result = applyReview(baseState(), { ...base, decision: "approve", note: "" });
    assert.ok(result.ok);
    const { state, packet } = result.value;
    assert.equal(packet.kind, "plan_response");
    assert.equal(packet.direction, "to_station");
    assert.equal(packet.idempotencyKey, "plan-response:pp-1");
    assert.deepEqual(packet.payload, {
      proposalId: "pp-1",
      decision: "approve",
      note: "",
      reviewerId: "demo-earth-md-01",
    });
    assert.equal(state.queue.length, 1);
    assert.equal(state.proposals[0]?.review?.decision, "approve");
    assert.equal(state.proposals[0]?.review?.packetId, "p-r1");
  });

  it("modify keeps the edited steps and the note", () => {
    const result = applyReview(baseState(), {
      ...base,
      decision: "modify",
      steps: ["Dormir 9 h"],
      note: "Más descanso",
    });
    assert.ok(result.ok);
    assert.deepEqual(result.value.packet.payload.steps, ["Dormir 9 h"]);
    assert.equal(result.value.state.proposals[0]?.review?.note, "Más descanso");
  });

  it("reject keeps the note and no steps", () => {
    const result = applyReview(baseState(), { ...base, decision: "reject", note: "No procede" });
    assert.ok(result.ok);
    assert.equal("steps" in result.value.packet.payload, false);
  });

  it("refuses an unknown proposal", () => {
    const result = applyReview(baseState(), { ...base, proposalId: "zzz", decision: "approve", note: "" });
    assert.equal(result.ok, false);
  });

  it("refuses a second review of the same proposal and queues nothing new", () => {
    const first = applyReview(baseState(), { ...base, decision: "approve", note: "" });
    assert.ok(first.ok);
    const second = applyReview(first.value.state, { ...base, packetId: "p-r2", decision: "reject", note: "tarde" });
    assert.equal(second.ok, false);
    assert.equal(first.value.state.queue.length, 1);
  });

  it("refuses an anonymous reviewer", () => {
    const result = applyReview(baseState(), { ...base, actorId: " ", decision: "approve", note: "" });
    assert.equal(result.ok, false);
  });
});
