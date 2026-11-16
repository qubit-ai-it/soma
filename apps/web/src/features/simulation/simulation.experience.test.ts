import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CARDIAC_ARREST_MAX_BPM, cardiacArrestIncident } from "./simulation.experience.ts";
import type { SimulationState, Telemetry } from "./simulation.ts";

const telemetry = (heartRateBpm: number): Telemetry => ({
  heartRateBpm, spo2Pct: 97, sleepHours: 7, cumulativeDoseMsv: 20, systolic: 120, diastolic: 78,
});

const crew = (heartRateBpm: number) => [
  { id: "cm-a1", name: "Ada", role: "Pilot", position: { x: 10, y: 10 }, updatedAt: null, telemetry: telemetry(heartRateBpm) },
  { id: "cm-b2", name: "Grace", role: "Pilot", position: { x: 20, y: 20 }, updatedAt: null, telemetry: telemetry(70) },
];

const decision = (status: "critical" | "watch", affectedCrewId: string | null) => ({
  status, affectedCrewId, signals: ["heartRateBpm" as const], instructions: [],
});

type Input = Pick<SimulationState, "crew" | "decision" | "incidentOpenedWith">;

describe("cardiacArrestIncident", () => {
  it("fires when the affected member's pulse is at or below the threshold", () => {
    for (const bpm of [0, 5, CARDIAC_ARREST_MAX_BPM]) {
      const input: Input = { crew: crew(bpm), decision: decision("critical", "cm-a1") };
      assert.deepEqual(cardiacArrestIncident(input), { crewId: "cm-a1", name: "Ada" }, String(bpm));
    }
  });

  it("does not fire for other critical readings such as a pulse of 30 or 160", () => {
    for (const bpm of [CARDIAC_ARREST_MAX_BPM + 1, 30, 35, 160]) {
      const input: Input = { crew: crew(bpm), decision: decision("critical", "cm-a1") };
      assert.equal(cardiacArrestIncident(input), null, String(bpm));
    }
  });

  it("needs a critical decision with an affected member that exists", () => {
    assert.equal(cardiacArrestIncident({ crew: crew(0), decision: decision("watch", "cm-a1") }), null);
    assert.equal(cardiacArrestIncident({ crew: crew(0), decision: decision("critical", null) }), null);
    assert.equal(cardiacArrestIncident({ crew: crew(0), decision: decision("critical", "cm-zz") }), null);
    assert.equal(cardiacArrestIncident({ crew: crew(0), decision: null }), null);
  });

  it("keeps the incident open when the incident opened with an arrest, even after the pulse recovers", () => {
    const input: Input = {
      crew: crew(75),
      decision: decision("critical", "cm-a1"),
      incidentOpenedWith: telemetry(0),
    };
    assert.deepEqual(cardiacArrestIncident(input), { crewId: "cm-a1", name: "Ada" });
  });
});
