import assert from "node:assert/strict";
import { test } from "node:test";
import { locationAt } from "./deck.ts";
import { restartSituation } from "./simulation.reset.ts";
import { roomCenter, roomIds, type SimulationState } from "./simulation.ts";

const nominal = { heartRateBpm: 72, spo2Pct: 98, systolic: 120, diastolic: 78, sleepHours: 7, cumulativeDoseMsv: 30 };
const fresh: SimulationState = {
  version: 0, revision: 0, phase: "idle", decision: null, messages: [], changes: [],
  crew: ["cm-a1", "cm-b2", "cm-c3", "cm-d4"].map((id, index) => ({
    id, name: `Crew member ${index + 1}`, role: "Crew member",
    position: roomCenter(roomIds[index]), telemetry: { ...nominal }, updatedAt: null,
  })),
};

test("restart clears the incident and chats, restores readings, and spreads the crew across valid rooms", () => {
  const current: SimulationState = {
    ...fresh, version: 12, revision: 8, phase: "done",
    crew: fresh.crew.map((member, index) => index === 0
      ? { ...member, telemetry: { ...member.telemetry, heartRateBpm: 0 } } : member),
    decision: { status: "critical", affectedCrewId: "cm-a1", signals: ["heartRateBpm"], instructions: [] },
    messages: [{ id: "1", at: "2026-01-01T00:00:00Z", crewId: "cm-b2", message: "Help", destination: null, via: null }],
    changes: [{ crewId: "cm-a1", at: "2026-01-01T00:00:00Z", kind: "telemetry", before: nominal, after: { ...nominal, heartRateBpm: 0 } }],
    error: "Previous error",
  };

  const result = restartSituation(current, fresh);
  assert.equal(result.phase, "idle");
  assert.equal(result.decision, null);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.changes, []);
  assert.equal(result.error, undefined);
  assert.equal(result.version, 13);
  assert.equal(result.revision, 9);
  assert.deepEqual(result.crew.map(({ telemetry }) => telemetry), fresh.crew.map(({ telemetry }) => telemetry));
  const locations = result.crew.map(({ position }) => locationAt(position));
  assert.equal(new Set(locations).size, 4);
  assert.ok(locations.every((location) => roomIds.includes(location as typeof roomIds[number])));
});
