import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { err, ok } from "../../shared/result.ts";
import type { Notification, NewNotification } from "../notifications/notifications.types.ts";
import { createSentryTalk } from "./sentry.talk.service.ts";

const NOW = Date.parse("2026-11-16T19:00:00Z");
const members = [
  { id: "cm-1a2b3c01", label: "Crew member cm-1a2b3c01" },
  { id: "cm-1a2b3c02", label: "Crew member cm-1a2b3c02" },
];

function setup(over: Partial<Parameters<typeof createSentryTalk>[0]> = {}) {
  const store = new Map<string, NewNotification>();
  const talk = createSentryTalk({
    notifications: {
      add: async (input) => {
        const duplicate = store.has(input.dedupeKey);
        store.set(input.dedupeKey, input);
        return { notification: {} as Notification, duplicate };
      },
      listFor: async () => [],
      markRead: async () => true,
      latestOfKind: async (kind) => {
        const found = [...store.values()].filter((n) => n.kind === kind).at(-1);
        return found ? ({ payload: found.payload } as Notification) : null;
      },
    },
    members: async () => members,
    alerts: async () => [],
    latestStatus: async () => "F0",
    earthLink: async () => ({ status: "connected", updatedAt: "2026-11-16T10:00:00.000Z" }),
    spaceWeather: async () => err("source down"),
    ...over,
  });
  return { talk, store };
}

describe("sentry talk", () => {
  it("adds check-ins and shift summaries, and is idempotent", async () => {
    const { talk, store } = setup();
    const first = await talk.run(NOW, { force: true });
    assert.equal(first.added, 2 + 3);
    const second = await talk.run(NOW, { force: true });
    assert.equal(second.added, 0);
    assert.equal(store.size, 5);
  });

  it("throttles repeated runs unless forced", async () => {
    const { talk } = setup();
    await talk.run(NOW);
    assert.deepEqual(await talk.run(NOW + 1000), { added: 0, skipped: true });
    assert.equal((await talk.run(NOW + 61_000)).skipped, false);
  });

  it("notifies a lost link once and then the recovery", async () => {
    let status: "connected" | "disconnected" = "disconnected";
    let stamp = 1;
    const { talk, store } = setup({
      earthLink: async () => ({ status, updatedAt: `2026-11-16T10:0${stamp}:00.000Z` }),
    });
    await talk.run(NOW, { force: true });
    stamp = 2;
    await talk.run(NOW, { force: true });
    status = "connected";
    stamp = 3;
    await talk.run(NOW, { force: true });
    const links = [...store.values()].filter((n) => n.kind === "link").map((n) => n.title);
    assert.deepEqual(links, ["Earth link lost", "Earth link restored"]);
  });

  it("adds space weather only from real sources and survives a failing source", async () => {
    const live = {
      events: [],
      protonFluxPfu10Mev: 0.1,
      kpIndex: 6,
      xrayClass: null,
      source: { provider: "NOAA SWPC", mode: "live" as const, fetchedAt: "x" },
    };
    const { talk, store } = setup({ spaceWeather: async () => ok(live) });
    await talk.run(NOW, { force: true });
    assert.ok([...store.values()].some((n) => n.title === "Geomagnetic storm G2"));

    const broken = setup({
      spaceWeather: async () => {
        throw new Error("boom");
      },
      earthLink: async () => {
        throw new Error("boom");
      },
    });
    const outcome = await broken.talk.run(NOW, { force: true });
    assert.equal(outcome.added, 5);
  });
});
