import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CrewMember } from "../crew/crew.types.ts";
import { buildCrew, emptyState, reconcileCrew } from "./simulation.crew.ts";
import { crewColorToken, crewColorTokens, crewIdSchema } from "./simulation.ts";

function registered(id: string, name: string): CrewMember {
  return {
    id, name, role: "Flight Engineer",
    vitals: { heartRateBpm: 66, spo2Pct: 97, sleepHours: 6.5 },
    history: [], cumulativeDoseMsv: 41, lastCheckIn: "2026-01-01T00:00:00Z",
  } as CrewMember;
}

describe("simulation crew", () => {
  const ada = registered("cm-1a2b3c4d", "Ada Byron");
  const grace = registered("cm-5e6f7a8b", "Grace Hopper");

  it("accepts generated member ids only", () => {
    assert.ok(crewIdSchema.safeParse("cm-1a2b3c4d").success);
    assert.ok(!crewIdSchema.safeParse("CM-01").success);
    assert.ok(!crewIdSchema.safeParse("member-1").success);
  });

  it("builds telemetry from the member vitals", () => {
    const [member] = buildCrew([ada]);
    assert.equal(member.name, "Ada Byron");
    assert.equal(member.telemetry.heartRateBpm, 66);
    assert.equal(member.telemetry.cumulativeDoseMsv, 41);
    assert.equal(member.telemetry.systolic, 120);
  });

  it("adds new members, drops removed ones and keeps the state of the rest", () => {
    const state = emptyState(buildCrew([ada, grace]));
    const moved = {
      ...state,
      crew: state.crew.map((m) => m.id === ada.id ? { ...m, position: { x: 5, y: 5 } } : m),
      messages: [{ id: "1", at: "2026-01-01T00:00:00Z", crewId: grace.id, message: "Hi", destination: null, via: null }],
    };
    const linus = registered("cm-99887766", "Linus Torvalds");

    const next = reconcileCrew(moved, [ada, linus]);
    assert.deepEqual(next.crew.map(({ id }) => id), [ada.id, linus.id]);
    assert.deepEqual(next.crew[0].position, { x: 5, y: 5 });
    assert.deepEqual(next.messages, []);
    assert.equal(next.version, moved.version + 1);
    assert.equal(reconcileCrew(next, [ada, linus]), next);
  });

  it("supports an empty crew and cycles colours past the palette", () => {
    const state = reconcileCrew(emptyState(buildCrew([ada])), []);
    assert.deepEqual(state.crew, []);
    assert.equal(state.phase, "idle");
    const sim = buildCrew(Array.from({ length: 6 }, (_, i) => registered(`cm-0000000${i}`, `Member ${i}`)));
    assert.equal(crewColorToken(sim, sim[5].id), crewColorTokens[5 % crewColorTokens.length]);
  });
});
