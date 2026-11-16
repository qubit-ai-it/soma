import assert from "node:assert/strict";
import { test } from "node:test";
import { assessTelemetry, canEditTelemetry, equipmentFor, hasCriticalTelemetry, incidentOptions, incidentProgress, isCrewInDanger, needsIncidentReview, validIncidentTransition } from "./incident.ts";
import { roomCenter, type Decision, type SimulationState } from "./simulation.ts";

const lab = roomCenter("laboratory");
const medical = roomCenter("medical");
const nominal = { heartRateBpm: 72, spo2Pct: 98, systolic: 120, diastolic: 78, sleepHours: 7, cumulativeDoseMsv: 30 };
const critical: Decision = {
  status: "critical",
  equipmentId: "defibrillator",
  affectedCrewId: "cm-d4",
  signals: ["heartRateBpm"],
  instructions: [
    { crewId: "cm-c3", message: "Go to the laboratory.", destination: "laboratory", via: null },
    { crewId: "cm-b2", message: "Bring the equipment.", destination: "laboratory", via: "medical" },
  ],
};
const resolved: Decision = { status: "resolved", affectedCrewId: null, signals: [], instructions: [] };

function scenario({ pulse = 0, secondArrives = true }: { pulse?: number; secondArrives?: boolean } = {}): SimulationState {
  return {
    version: 1, revision: 1, phase: "done", changes: [], messages: [],
    decision: critical,
    incidentOpenedWith: { ...nominal, heartRateBpm: 0 },
    crew: [
      { id: "cm-d4", name: "Ada", role: "Crew member", telemetry: { ...nominal, heartRateBpm: pulse }, position: lab, updatedAt: null },
      { id: "cm-c3", name: "Grace", role: "Crew member", telemetry: nominal, position: lab, updatedAt: null },
      { id: "cm-b2", name: "Linus", role: "Crew member", telemetry: nominal, position: secondArrives ? lab : medical, updatedAt: null },
    ],
  };
}

test("arrival of both responders keeps a zero or below-range reading active", () => {
  for (const pulse of [0, 10]) {
    const state = scenario({ pulse });
    assert.deepEqual(incidentProgress(state)?.arrivals.map(({ arrived }) => arrived), [true, true]);
    assert.equal(validIncidentTransition(state, critical), true);
    assert.equal(validIncidentTransition(state, resolved), false);
  }
});

test("a crew member stays immovable until critical readings and the critical decision have cleared", () => {
  const state = scenario();
  assert.equal(isCrewInDanger(state, state.crew[0]), true);
  state.crew[0].telemetry.heartRateBpm = 72;
  assert.equal(isCrewInDanger(state, state.crew[0]), true);
  state.decision = resolved;
  assert.equal(isCrewInDanger(state, state.crew[0]), false);
});

test("critical readings unlock only after both assigned helpers have arrived", () => {
  const state = scenario({ secondArrives: false });
  assert.equal(canEditTelemetry(state, state.crew[0]), false);
  assert.equal(canEditTelemetry(state, state.crew[1]), true);
  state.crew[2].position = lab;
  assert.equal(canEditTelemetry(state, state.crew[0]), true);

  state.decision = { ...critical, instructions: [critical.instructions[0]] };
  assert.equal(canEditTelemetry(state, state.crew[0]), false);
  state.decision = critical;
  state.crew[0].telemetry.heartRateBpm = 72;
  assert.equal(canEditTelemetry(state, state.crew[0]), true);
  state.decision = null;
  state.crew[0].telemetry.heartRateBpm = 0;
  assert.equal(canEditTelemetry(state, state.crew[0]), false);
});

test("an early correction keeps the incident and both assignments while one responder is in transit", () => {
  const state = scenario({ pulse: 72, secondArrives: false });
  assert.deepEqual(incidentProgress(state)?.arrivals.map(({ arrived }) => arrived), [true, false]);
  assert.equal(validIncidentTransition(state, resolved), false);
  assert.equal(validIncidentTransition(state, { ...critical, instructions: [] }), false);
});

test("both arrivals and a corrected reading allow MedGemma to resolve the incident", () => {
  const state = scenario({ pulse: 72 });
  assert.equal(incidentProgress(state)?.canResolve, true);
  assert.equal(validIncidentTransition(state, resolved), true);
  delete state.incidentOpenedWith;
  assert.equal(validIncidentTransition(state, resolved), true);
});

test("all zero-pulse readings stay visible and are reviewed when no incident is active", () => {
  const state = scenario();
  state.crew[1] = { ...state.crew[1], telemetry: { ...nominal, heartRateBpm: 0 } };

  assert.deepEqual(state.crew.filter(hasCriticalTelemetry).map(({ id }) => id), ["cm-d4", "cm-c3"]);
  assert.equal(needsIncidentReview(state), false);
  assert.equal(needsIncidentReview({ ...state, phase: "pending" }), false);
  assert.equal(needsIncidentReview({ ...state, decision: resolved }), true);
  assert.equal(needsIncidentReview({ ...state, decision: { ...resolved, status: "nominal" } }), true);
});

test("an existing pulse-zero incident can close despite unrelated signals added by the model", () => {
  const state = scenario({ pulse: 70 });
  state.decision = { ...critical, signals: ["heartRateBpm", "spo2Pct", "systolic"] };

  assert.deepEqual(incidentProgress(state)?.readings.map(({ signal }) => signal), ["heartRateBpm"]);
  assert.equal(needsIncidentReview(state), true);
  assert.equal(validIncidentTransition(state, resolved), true);
});

test("after correcting pulse, mild oxygen can move to watch and severe oxygen keeps the alert", () => {
  const state = scenario({ pulse: 70 });
  const watch: Decision = { ...critical, status: "watch", signals: ["spo2Pct"], instructions: [] };
  state.crew[0].telemetry.spo2Pct = 93;
  assert.equal(validIncidentTransition(state, watch), true);
  assert.equal(validIncidentTransition(state, resolved), false);
  assert.equal(validIncidentTransition(state, { ...watch, signals: ["systolic"] }), false);

  const followUp = { ...state, decision: watch };
  assert.equal(needsIncidentReview(followUp), false);
  state.crew[0].telemetry.spo2Pct = 88;
  assert.equal(validIncidentTransition(state, watch), false);
  assert.equal(validIncidentTransition(followUp, watch), false);
  assert.equal(validIncidentTransition(state, { ...watch, status: "critical", instructions: critical.instructions }), true);
  state.crew[0].telemetry.spo2Pct = 98;
  assert.equal(needsIncidentReview(followUp), true);
  assert.equal(validIncidentTransition(followUp, resolved), true);
});

test("every telemetry field can independently trigger a critical scenario with a nonzero pulse", () => {
  const examples = [
    ["heartRateBpm", 160, "bloodPressureMonitor"], ["spo2Pct", 88, "oximeter"],
    ["systolic", 190, "bloodPressureMonitor"], ["diastolic", 125, "bloodPressureMonitor"],
    ["cumulativeDoseMsv", 275, "dosimeter"],
  ] as const;
  for (const [signal, value, tool] of examples) {
    const state = scenario({ pulse: 72 });
    state.decision = { ...resolved, status: "nominal" };
    const affected = state.crew[0];
    affected.telemetry[signal] = value;
    assert.equal(assessTelemetry(affected.telemetry).find((reading) => reading.signal === signal)?.severity, "critical");
    assert.equal(hasCriticalTelemetry(affected), true);
    assert.deepEqual(incidentOptions(state), { statuses: ["critical"], affectedIds: [affected.id] });
    assert.deepEqual(equipmentFor(affected.telemetry), tool ? [tool] : []);
  }
});

test("sleep is informational and an old sleep-only alert can close without changing it or moving responders", () => {
  const state = scenario({ pulse: 72, secondArrives: false });
  state.crew[0].telemetry.sleepHours = 2;
  assert.equal(hasCriticalTelemetry(state.crew[0]), false);
  assert.deepEqual(equipmentFor(state.crew[0].telemetry), []);
  state.decision = { ...critical, equipmentId: null, signals: ["sleepHours"] };
  assert.equal(needsIncidentReview(state), true);
  assert.equal(validIncidentTransition(state, resolved), true);
  state.crew[0].telemetry.spo2Pct = 93;
  assert.equal(needsIncidentReview(state), true);
  assert.equal(validIncidentTransition(state, { ...critical, status: "watch", equipmentId: null, signals: ["spo2Pct"], instructions: [] }), true);
});

test("a new critical signal takes precedence over another crew member in watch", () => {
  const state = scenario({ pulse: 72 });
  state.crew[0].telemetry.spo2Pct = 93;
  state.crew[1] = { ...state.crew[1], telemetry: { ...nominal, diastolic: 125 } };
  state.decision = { ...critical, status: "watch", signals: ["spo2Pct"], instructions: [] };
  assert.deepEqual(incidentOptions(state), { statuses: ["critical"], affectedIds: [state.crew[1].id] });
});

test("an equipment carrier in the destination still needs to visit the pickup module", () => {
  const state = scenario({ pulse: 72 });
  const [direct, carrier] = critical.instructions;
  state.decision = { ...critical, instructions: [direct, { ...carrier, equipmentCollected: false }] };
  assert.equal(incidentProgress(state)?.arrivals[1].pickup, "medical");
  assert.equal(canEditTelemetry(state, state.crew[0]), false);
  assert.equal(incidentProgress(state)?.canResolve, false);
});
