import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ok } from "../../shared/result.ts";
import type { Alert } from "../alerts/alerts.types.ts";
import type { NewNotification } from "../notifications/notifications.types.ts";
import type { ObservationsRepository } from "../observation/observation.repository.ts";
import type { Observation } from "../observation/observation.types.ts";
import type { Evaluation } from "../rules/rules.types.ts";
import type { EvaluationsRepository, StoredEvaluation } from "./evaluations.repository.ts";
import { createSentryService } from "./sentry.service.ts";
import { syntheticHeartRate } from "./sentry.simulation.ts";

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
    latest: async () => rows[0] ?? null,
    history: async () => [...rows],
    saveIfChanged: async (evaluation: Evaluation) => {
      const previous = rows[0] ?? null;
      const history = [...rows];
      if (previous && previous.status === evaluation.status) {
        return { evaluation: previous, saved: false, previous, history };
      }
      const stored = { ...evaluation, id: `ev-${rows.length}` };
      rows.unshift(stored);
      return { evaluation: stored, saved: true, previous, history };
    },
  };
}

function setup() {
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
    },
    raiseAlert: async (input) => {
      raised.push(input);
      return ok({ id: input.alertId ?? "x", level: input.level } as Alert);
    },
    memberFor: (s) => s,
    labelFor: (m) => `Tripulante ${m}`,
  });
  const feed = async (subject: string, from: number, to: number) => {
    for (let k = from; k < to; k++) await observations.add(syntheticHeartRate(subject, T0 + k * 5000, T0));
  };
  return { service, feed, raised, notified };
}

describe("sentry service", () => {
  it("stays calibrating until there is data after the baseline", async () => {
    const { service, feed } = setup();
    await feed("cm-01", 0, 6);
    assert.deepEqual(await service.process("cm-01"), { phase: "calibrating" });
  });

  it("saves the first level without alerting on F0", async () => {
    const { service, feed, raised, notified } = setup();
    await feed("cm-01", 0, 20);
    const outcome = await service.process("cm-01");
    assert.ok(outcome.phase === "evaluated" && outcome.saved && !outcome.raised);
    assert.equal(raised.length + notified.length, 0);
  });

  it("raises an F2 alert as sentry and notifies the person and the CMO", async () => {
    const { service, feed, raised, notified } = setup();
    await feed("cm-02", 0, 20);
    await service.process("cm-02");
    await feed("cm-02", 20, 42);
    const outcome = await service.process("cm-02");
    assert.ok(outcome.phase === "evaluated" && outcome.raised);
    assert.equal(raised.length, 1);
    assert.equal(raised[0].actorId, "sentry");
    assert.equal(raised[0].level, "F2");
    assert.deepEqual(notified[0].audience, ["member:cm-02", "role:cmo"]);
    assert.equal(notified[0].priority, "high");
    assert.equal(notified[0].payload?.alertId, raised[0].alertId);
    assert.ok(!JSON.stringify(notified[0]).includes("bpm"));
  });

  it("does not save or alert again when the level has not changed", async () => {
    const { service, feed, raised } = setup();
    await feed("cm-02", 0, 42);
    await service.process("cm-02");
    await feed("cm-02", 42, 45);
    const outcome = await service.process("cm-02");
    assert.ok(outcome.phase === "evaluated" && !outcome.saved);
    assert.equal(raised.length, 1);
  });

  it("broadcasts F3 to the whole crew and Earth", async () => {
    const { service, feed, notified } = setup();
    await feed("cm-03", 0, 80);
    await service.process("cm-03");
    await feed("cm-03", 80, 92);
    await service.process("cm-03");
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
});
