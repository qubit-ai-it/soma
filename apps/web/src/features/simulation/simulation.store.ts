import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createJsonStore } from "../../server/json-store.ts";
import { crewFileSchema } from "../crew/crew.schema.ts";
import { evaluateSimulation } from "./orchestrator.ts";
import { activeIncident, needsIncidentReview } from "./incident.ts";
import { constrainToDeck, locationAt } from "./deck.ts";
import { crewIds, telemetrySchema, type SimulationState, type SimulationUpdate } from "./simulation.ts";

const dataDir = path.join(process.cwd(), "data");
const seedDir = path.join(dataDir, "seed");
const store = createJsonStore({
  seedDir,
  runtimeDir: path.join(dataDir, "runtime"),
});
const key = "simulation";
const startPositions = [
  { x: 17, y: 29 }, { x: 17, y: 75 }, { x: 52, y: 31 }, { x: 84, y: 28 }, { x: 52, y: 74 },
];

async function initialState(): Promise<SimulationState> {
  const crew = crewFileSchema.parse(JSON.parse(await readFile(path.join(seedDir, "crew.json"), "utf8"))).crew;
  return {
    revision: 0, version: 0, phase: "idle", changes: [], decision: null, messages: [],
    crew: crewIds.map((id, index) => {
      const member = crew.find((candidate) => candidate.id === id);
      return {
        id,
        name: member?.name ?? "Nora Vega",
        role: member?.role ?? "Oficial de sistemas",
        position: startPositions[index],
        updatedAt: null,
        telemetry: {
          ...(member?.vitals ?? { heartRateBpm: 70, spo2Pct: 98, sleepHours: 7 }),
          cumulativeDoseMsv: member?.cumulativeDoseMsv ?? 33,
          systolic: 120,
          diastolic: 78,
        },
      };
    }),
  };
}

function fitSavedDeck(state: SimulationState): SimulationState {
  const crew = state.crew.map((member) => {
    const position = constrainToDeck(member.position);
    return position === member.position ? member : { ...member, position };
  });
  const affected = crew.find(({ id }) => id === state.decision?.affectedCrewId);
  const destination = affected && locationAt(affected.position);
  const reroute = state.phase === "done" && state.decision?.status === "critical" && destination
    && state.decision.instructions.some((instruction) => instruction.destination && instruction.destination !== destination);
  if (!reroute && crew.every((member, index) => member === state.crew[index])) return state;
  return { ...state, crew, phase: reroute ? "pending" : state.phase, version: state.version + 1, revision: state.revision + 1 };
}

export async function getSimulation(): Promise<SimulationState> {
  const saved = await store.read(key) as SimulationState | null;
  if (saved && fitSavedDeck(saved) === saved) return saved;
  return await store.update(key, async (current) => fitSavedDeck((current as SimulationState | null) ?? await initialState())) as SimulationState;
}

export async function updateSimulation(update: SimulationUpdate): Promise<SimulationState> {
  await getSimulation();
  return await store.update(key, (stored) => {
    const state = stored as SimulationState;
    const version = state.version + 1;
    if (update.kind === "retry") {
      return state.phase === "idle" || state.phase === "error" || needsIncidentReview(state)
        ? { ...state, version, phase: "pending", error: undefined }
        : state;
    }
    if (update.kind === "clear-messages") {
      return state.messages.length > 0 ? { ...state, version, messages: [] } : state;
    }

    const member = state.crew.find(({ id }) => id === update.crewId)!;
    const at = new Date().toISOString();
    const position = update.kind === "move" ? constrainToDeck(update.position) : member.position;
    const before = update.kind === "move" ? member.position : member.telemetry;
    const after = update.kind === "move"
      ? position
      : telemetrySchema.parse({ ...member.telemetry, ...update.telemetry });
    if (JSON.stringify(before) === JSON.stringify(after)) return state;

    const nextMember = update.kind === "move"
      ? { ...member, position, updatedAt: at }
      : { ...member, telemetry: { ...member.telemetry, ...update.telemetry }, updatedAt: at };
    const decision = update.kind === "move" && state.decision ? {
      ...state.decision,
      instructions: state.decision.instructions.map((instruction) => (
        instruction.crewId === member.id && instruction.equipmentCollected === false && instruction.via === locationAt(position)
          ? { ...instruction, equipmentCollected: true } : instruction
      )),
    } : state.decision;
    return {
      ...state, decision, version, revision: state.revision + 1, phase: "pending", error: undefined,
      crew: state.crew.map((current) => current.id === member.id ? nextMember : current),
      changes: [...state.changes, { crewId: member.id, at, kind: update.kind, before, after }].slice(-16),
    } satisfies SimulationState;
  }) as SimulationState;
}

async function evaluatePending() {
  while (true) {
    const state = await getSimulation();
    if (state.phase !== "pending") return;
    const result = await evaluateSimulation(state);
    await store.update(key, (stored) => {
      const current = stored as SimulationState;
      if (current.revision !== state.revision || current.phase !== "pending") return current;
      const version = current.version + 1;
      if (!result.ok) return { ...current, version, phase: "error", error: result.error };

      const at = new Date().toISOString();
      const previousInstructions = current.decision?.instructions ?? [];
      const incident = activeIncident(result.value);
      const previousIncident = activeIncident(current.decision);
      const affected = current.crew.find(({ id }) => id === incident?.affectedCrewId);
      const incidentOpenedWith = affected && (
        previousIncident?.affectedCrewId === affected.id
          ? current.incidentOpenedWith
          : affected.telemetry
      );
      const messages = result.value.instructions
        .filter((entry) => !previousInstructions.some((previous) => (
          previous.crewId === entry.crewId && previous.message === entry.message
          && previous.via === entry.via && previous.destination === entry.destination
        )))
        .map((entry) => ({ ...entry, at, id: `${version}-${entry.crewId}` }));
      return {
        ...current,
        version,
        phase: "done",
        decision: result.value,
        incidentOpenedWith,
        messages: [...current.messages, ...messages].slice(-150),
      } satisfies SimulationState;
    });
  }
}

const worker = globalThis as typeof globalThis & { __somaSimulationWorker?: Promise<void> };

export function runPendingSimulation(): Promise<void> {
  return (worker.__somaSimulationWorker ??= evaluatePending().finally(() => {
    delete worker.__somaSimulationWorker;
  }));
}
