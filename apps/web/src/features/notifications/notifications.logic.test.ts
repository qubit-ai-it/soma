import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  alertDedupeKey,
  audienceForLevel,
  CREW_ALL,
  isVisibleTo,
  roleKey,
} from "./notifications.logic.ts";

describe("notification audiences", () => {
  it("F2 reaches the person and the CMO only", () => {
    const audience = audienceForLevel("F2", "cm-02");
    assert.ok(isVisibleTo(audience, { role: "astronaut", memberId: "cm-02" }));
    assert.ok(isVisibleTo(audience, { role: "cmo" }));
    assert.ok(!isVisibleTo(audience, { role: "astronaut", memberId: "cm-03" }));
    assert.ok(!isVisibleTo(audience, { role: "commander" }));
    assert.ok(!isVisibleTo(audience, { role: "earth" }));
  });

  it("NOT_EVALUABLE reaches only the CMO", () => {
    const audience = audienceForLevel("NOT_EVALUABLE", "cm-02");
    assert.ok(isVisibleTo(audience, { role: "cmo" }));
    assert.ok(!isVisibleTo(audience, { role: "astronaut", memberId: "cm-02" }));
  });

  it("F3 broadcasts to the whole crew and Earth", () => {
    const audience = audienceForLevel("F3", "cm-02");
    assert.deepEqual(audience, [CREW_ALL, roleKey("earth")]);
    for (const viewer of [
      { role: "astronaut" as const, memberId: "cm-09" },
      { role: "cmo" as const },
      { role: "commander" as const },
      { role: "earth" as const },
    ]) {
      assert.ok(isVisibleTo(audience, viewer));
    }
  });

  it("F0 and F1 notify nobody", () => {
    assert.deepEqual(audienceForLevel("F0", "cm-02"), []);
    assert.deepEqual(audienceForLevel("F1", "cm-02"), []);
  });

  it("an astronaut without member id sees only crew broadcasts", () => {
    assert.ok(!isVisibleTo(audienceForLevel("F2", "cm-02"), { role: "astronaut" }));
    assert.ok(isVisibleTo([CREW_ALL], { role: "astronaut" }));
  });

  it("dedupe key repeats inside the window and changes after it", () => {
    const w = 10 * 60_000;
    const a = alertDedupeKey("cm-02", "F2", 1_000, w);
    assert.equal(a, alertDedupeKey("cm-02", "F2", w - 1, w));
    assert.notEqual(a, alertDedupeKey("cm-02", "F2", w + 1, w));
    assert.notEqual(a, alertDedupeKey("cm-02", "F3", 1_000, w));
    assert.notEqual(a, alertDedupeKey("cm-03", "F2", 1_000, w));
  });
});
