import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mergeNotifications, sentryFeed, toneFor, unreadIds } from "./notifications.display.ts";
import type { Notification } from "./notifications.types.ts";

const make = (seq: number, over: Partial<Notification> = {}): Notification => ({
  id: `n${seq}`,
  seq,
  dedupeKey: `k${seq}`,
  kind: "summary",
  priority: "normal",
  title: "t",
  audience: ["crew:all"],
  payload: {},
  createdAt: "2026-11-16T10:00:00.000Z",
  read: false,
  ...over,
});

describe("notification display", () => {
  it("maps priority to tone", () => {
    assert.deepEqual(
      (["critical", "high", "normal", "low"] as const).map(toneFor),
      ["danger", "warn", "info", "neutral"],
    );
  });

  it("keeps alerts out of the Sentry feed and collapses low priority into the digest", () => {
    const feed = sentryFeed([
      make(1, { kind: "alert", priority: "critical" }),
      make(2, { priority: "low" }),
      make(3),
      make(4, { priority: "high", kind: "link" }),
      make(5, { priority: "low", kind: "checkin" }),
    ]);
    assert.deepEqual(feed.primary.map((n) => n.seq), [4, 3]);
    assert.deepEqual(feed.digest.map((n) => n.seq), [5, 2]);
  });

  it("counts unread non-alert notifications only", () => {
    assert.deepEqual(
      unreadIds([make(1, { kind: "alert" }), make(2), make(3, { read: true }), make(4)]),
      ["n2", "n4"],
    );
  });

  it("merges by id, newest first, and never un-reads a notification", () => {
    const merged = mergeNotifications([make(1, { read: true }), make(2)], [make(1), make(3)]);
    assert.deepEqual(merged.map((n) => n.seq), [3, 2, 1]);
    assert.equal(merged.find((n) => n.seq === 1)?.read, true);
  });
});
