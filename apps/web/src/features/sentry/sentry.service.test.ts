import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ok } from "../../shared/result.ts";
import type { Alert } from "../alerts/alerts.types.ts";
import type { NewNotification } from "../notifications/notifications.types.ts";
import type { ObservationsRepository } from "../observation/observation.repository.ts";
import type { Observation } from "../observation/observation.types.ts";
import type { Evaluation } from "../rules/rules.types.ts";
import type { EvaluationsRepository, StoredEvaluation } from "./evaluations.repository.ts";
import { BACKFILL_POINTS } from "./sentry.simulation.ts";
import { createSentryService } from "./sentry.service.ts";
import { CALM, FIXTURE_MEMBERS, MODERATE, QUIET, SPIKE, fixtureHeartRate } from "./sentry.fixtures.ts";

const T0 = 1_800_000_000_000 - (1_800_000_000_000 % 5000);

function memoryObservations(): ObservationsRepository & { all: Observation[] } {
  const all: Observation[] = [];
  return {
    all,
    add: async (o) => {
      const exists = all.some((x) => x.id === o.id);
      if (!exists) all.push(o);
      return { observation: o, duplicate: exists };
    },
    addMany: async (list) => {
      let stored = 0;
      for (const o of list) {
        if (all.some((x) => x.id === o.id)) continue;
        all.push(o);
        stored++;
      }
      return { stored, duplicates: list.length - stored };
    },
    listBySubject: async (subject, options = {}) => {
      let rows = all.filter((o) => o.subjectId === subject && (!options.signal || o.signal === options.signal));
      rows = rows.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
      if (options.newest) return rows.slice(-(options.limit ?? 500));
      return rows.slice(0, options.limit ?? 500);
    },
  };
}

function memoryEvaluations(): EvaluationsRepository {
  const rows: StoredEvaluation[] = [];
  return {
    latest: async (subjectId) => rows.find((r) => r.subjectId === subjectId) ?? null,
    history: async (subjectId) => rows.filter((r) => r.subjectId === subjectId),
    saveIfChanged: async (evaluation: Evaluation) => {
      const history = rows.filter((r) => r.subjectId === evaluation.subjectId);
      const previous = history[0] ?? null;
      if (previous && previous.status === evaluation.status) {
        return { evaluation: previous, saved: false, previous, history };
      }
      const stored = { ...evaluation, id: `ev-${rows.length}` };
      rows.unshift(stored);
      return { evaluation: stored, saved: true, previous, history };
    },
  };
}

function setup(members = FIXTURE_MEMBERS) {
  const observations = memoryObservations();
  const raised: Parameters<Parameters<typeof createSentryService>[0]["raiseAlert"]>[0][] = [];
  const notified: NewNotification[] = [];
  const service = createSentryService({
    observations,
    evaluations: memoryEvaluations(),
    notifications: {
      add: async (input) => {
        notified.push(input);
        return { notification: {} as never, duplicate: false };
      },
      listFor: async () => [],
      markRead: async () => true,
      latestOfKind: async () => null,
    },
    raiseAlert: async (input) => {
      raised.push(input);
      return ok({ id: input.alertId ?? "x", level: input.level } as Alert);
    },
    members: async () => members,
    memberFor: (s) => s,
    labelFor: (m) => `Crew member ${m}`,
  });
  const feed = async (subject: string, from: number, to: number) => {
    for (let k = from; k < to; k++) await observations.add(fixtureHeartRate(subject, T0 + k * 5000, T0));
  };
  return { service, feed, raised, notified, observations };
}

describe("sentry service", () => {
  it("stays calibrating until there is data after the baseline", async () => {
    const { service, feed } = setup();
    await feed(CALM, 0, 6);
    assert.deepEqual(await service.process(CALM), { phase: "calibrating" });
  });

  it("saves the first level without alerting on F0", async () => {
    const { service, feed, raised, notified } = setup();
    await feed(CALM, 0, 20);
    const outcome = await service.process(CALM);
    assert.ok(outcome.phase === "evaluated" && outcome.saved && !outcome.raised);
    assert.equal(raised.length + notified.length, 0);
  });

  it("raises an F2 alert as sentry and notifies the person and the CMO", async () => {
    const { service, feed, raised, notified } = setup();
    await feed(MODERATE, 0, 20);
    await service.process(MODERATE);
    await feed(MODERATE, 20, 42);
    const outcome = await service.process(MODERATE);
    assert.ok(outcome.phase === "evaluated" && outcome.raised);
    assert.equal(raised.length, 1);
    assert.equal(raised[0].actorId, "sentry");
    assert.equal(raised[0].level, "F2");
    assert.deepEqual(notified[0].audience, [`member:${MODERATE}`, "role:cmo"]);
    assert.equal(notified[0].priority, "high");
    assert.equal(notified[0].payload?.alertId, raised[0].alertId);
    assert.ok(!JSON.stringify(notified[0]).includes("bpm"));
  });

  it("does not save or alert again when the level has not changed", async () => {
    const { service, feed, raised } = setup();
    await feed(MODERATE, 0, 42);
    await service.process(MODERATE);
    await feed(MODERATE, 42, 45);
    const outcome = await service.process(MODERATE);
    assert.ok(outcome.phase === "evaluated" && !outcome.saved);
    assert.equal(raised.length, 1);
  });

  it("broadcasts F3 to the whole crew and Earth", async () => {
    const { service, feed, notified } = setup();
    await feed(SPIKE, 0, 80);
    await service.process(SPIKE);
    await feed(SPIKE, 80, 92);
    await service.process(SPIKE);
    const f3 = notified.find((n) => n.priority === "critical");
    assert.deepEqual(f3?.audience, ["crew:all", "role:earth"]);
  });

  it("tick emits synthetic blocks for the whole crew and is idempotent", async () => {
    const { service } = setup();
    const now = T0 + 120_000;
    const first = await service.tick(now);
    assert.equal(first.length, 4);
    assert.ok(first.every((s) => s.emitted > 0));
    const second = await service.tick(now);
    assert.ok(second.every((s) => s.emitted === 0));
  });

  it("backfills a bounded synthetic history once and picks up members added later", async () => {
    const members = [...FIXTURE_MEMBERS.slice(0, 1)];
    const { service, observations } = setup(members);
    const now = T0 + 120_000;
    await service.tick(now);
    const backfilled = observations.all.filter((o) => o.subjectId === CALM && o.provenance.type === "synthetic");
    assert.ok(backfilled.length >= BACKFILL_POINTS && backfilled.length <= BACKFILL_POINTS + 60);
    assert.ok(backfilled.every((o) => Number(o.value) >= 40 && Number(o.value) <= 110));
    const before = observations.all.length;
    await service.tick(now);
    assert.equal(observations.all.length, before);

    members.push(FIXTURE_MEMBERS[1]);
    const next = await service.tick(now + 5_000);
    assert.deepEqual(next.map((s) => s.subject), [CALM, MODERATE]);
    assert.ok(observations.all.some((o) => o.subjectId === MODERATE));
  });

  it("leaves a member with a live device untouched", async () => {
    const { service, observations } = setup([FIXTURE_MEMBERS[0]]);
    const now = T0 + 120_000;
    await observations.add({
      ...fixtureHeartRate(CALM, now - 15_000, T0),
      id: "real-1",
      provenance: { type: "real", source: "Web Bluetooth", device: "Band" },
    });
    await service.tick(now - 10 * 60_000);
    const [summary] = await service.tick(now);
    assert.equal(summary.emitted, 0);
  });
});

describe("sentry stale data", () => {
  const gapEnd = T0 + 100_000;
  const later = gapEnd + 12 * 60_000;

  it("flags a data gap once as not evaluable, for the CMO only", async () => {
    const { service, feed, raised, notified } = setup();
    await feed(CALM, 0, 20);
    await service.process(CALM);

    const flagged = await service.checkStale(later, [CALM], { force: true });
    assert.deepEqual(flagged, [{ subject: CALM, staleMinutes: 12 }]);
    assert.equal(raised.length, 1);
    assert.equal(raised[0].level, "NOT_EVALUABLE");
    assert.equal(raised[0].actorId, "sentry");
    assert.equal(notified[0].body, `Crew member ${CALM}: no data for 12 min`);
    assert.deepEqual(notified[0].audience, ["role:cmo"]);

    assert.deepEqual(await service.checkStale(later + 60_000, [CALM], { force: true }), []);
    assert.equal(raised.length, 1);
  });

  it("ignores fresh data and subjects that were never evaluated", async () => {
    const { service, feed, raised } = setup();
    await feed(CALM, 0, 20);
    await service.process(CALM);
    assert.deepEqual(await service.checkStale(gapEnd + 5 * 60_000, [CALM, QUIET], { force: true }), []);
    assert.equal(raised.length, 0);
  });

  it("throttles repeated checks unless forced", async () => {
    const { service, feed } = setup();
    await feed(CALM, 0, 20);
    await feed(MODERATE, 0, 20);
    await service.process(CALM);
    await service.process(MODERATE);
    assert.equal((await service.checkStale(later, [CALM])).length, 1);
    assert.deepEqual(await service.checkStale(later + 1000, [MODERATE]), []);
    assert.equal((await service.checkStale(later + 1000, [MODERATE], { force: true })).length, 1);
  });
});
