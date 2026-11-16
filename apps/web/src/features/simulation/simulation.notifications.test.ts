import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isVisibleTo } from "../notifications/notifications.logic.ts";
import { newNotificationSchema } from "../notifications/notifications.schema.ts";
import { instructionNotifications } from "./simulation.notifications.ts";
import type { ChatEntry } from "./simulation.ts";

const entry = (overrides: Partial<ChatEntry> = {}): ChatEntry => ({
  id: "4-cm-a1",
  at: "2026-11-16T12:00:00.000Z",
  crewId: "cm-a1",
  message: "Go to the medical area and bring the oximeter.",
  destination: "medical",
  via: "corridor",
  ...overrides,
});

describe("instructionNotifications", () => {
  it("creates one valid task notification per instruction, addressed to that member only", () => {
    const [a, b] = instructionNotifications([entry(), entry({ id: "4-cm-b2", crewId: "cm-b2" })], "Gemini");
    assert.ok(newNotificationSchema.safeParse(a).success);
    assert.equal(a.kind, "task");
    assert.equal(a.memberId, "cm-a1");
    assert.equal(a.body, "Go to the medical area and bring the oximeter.");
    assert.equal(a.payload?.source, "Gemini");
    assert.equal(a.payload?.destination, "Medical area");
    assert.equal(a.payload?.experience, "cpr");
    assert.equal(a.payload?.href, "/experience/cpr");
    assert.equal(isVisibleTo(a.audience, { role: "astronaut", memberId: "cm-a1" }), true);
    assert.equal(isVisibleTo(a.audience, { role: "astronaut", memberId: "cm-b2" }), false);
    assert.equal(isVisibleTo(b.audience, { role: "astronaut", memberId: "cm-b2" }), true);
  });

  it("uses the instruction id as the dedupe key so a retry never notifies twice", () => {
    const [a] = instructionNotifications([entry()], "MedGemma");
    assert.equal(a.dedupeKey, "simulation:4-cm-a1");
  });

  it("truncates long messages to the notification limit", () => {
    const [a] = instructionNotifications([entry({ message: "x".repeat(400) })], "MedGemma");
    assert.ok((a.body ?? "").length <= 280);
    assert.ok(newNotificationSchema.safeParse(a).success);
  });

  it("handles instructions without a destination", () => {
    const [a] = instructionNotifications([entry({ destination: null })], "MedGemma");
    assert.equal(a.payload?.destination, null);
  });
});
