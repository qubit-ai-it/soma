import "server-only";

import { getServices } from "../../server/services.ts";
import { evaluateSimulation } from "./orchestrator.ts";
import { activeIncident, canEditTelemetry, isCrewInDanger, needsIncidentReview } from "./incident.ts";
import { constrainToDeck, locationAt } from "./deck.ts";
import { buildCrew, emptyState, reconcileCrew } from "./simulation.crew.ts";
import { restartSituation } from "./simulation.reset.ts";
import { createSessionStore } from "./simulation.sessions.ts";
import { telemetrySchema, type SimulationState, type SimulationUpdate } from "./simulation.ts";

const listCrew = () => getServices().crew.list();

async function initialState(): Promise<SimulationState> {
  return emptyState(buildCrew(await listCrew()));
}

const store = createSessionStore(initialState);

export async function getSimulation(sessionId: string): Promise<SimulationState> {
  const members = await listCrew();
  return store.update(sessionId, (state) => reconcileCrew(state, members));
}

export async function updateSimulation(sessionId: string, update: SimulationUpdate): Promise<SimulationState> {
  const members = await listCrew();
  return await store.update(sessionId, async (current) => {
    const state = reconcileCrew(current, members);
    const version = state.version + 1;
    if (update.kind === "reset") {
      return restartSituation(state, emptyState(buildCrew(members)));
    }
    if (update.kind === "retry") {
      return state.phase === "idle" || state.phase === "error" || needsIncidentReview(state)
        ? { ...state, version, phase: "pending", error: undefined }
        : state;
    }
    const member = state.crew.find(({ id }) => id === update.crewId);
    if (!member) return state;
    if (update.kind === "move" && isCrewInDanger(state, member)) return state;
    if (update.kind === "telemetry" && !canEditTelemetry(state, member)) return state;
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
  });
}

async function evaluatePending(sessionId: string) {
  while (true) {
    const state = await getSimulation(sessionId);
    if (state.phase !== "pending") return;
    const result = await evaluateSimulation(state);
    await store.update(sessionId, (current) => {
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

export function runPendingSimulation(sessionId: string): Promise<void> {
  return store.runWorker(sessionId, () => evaluatePending(sessionId));
}
