import "server-only";

import { getNotificationsRepository } from "../../server/repositories.ts";
import { getPool } from "../../server/db.ts";
import { getServices } from "../../server/services.ts";
import { evaluateSimulation } from "./orchestrator.ts";
import { activeIncident, canEditTelemetry, isCrewInDanger, needsIncidentReview } from "./incident.ts";
import { constrainToDeck, locationAt } from "./deck.ts";
import { instructionNotifications } from "./simulation.notifications.ts";
import { PROVIDER_LABELS } from "./simulation.provider.ts";
import { buildCrew, emptyState, reconcileCrew } from "./simulation.crew.ts";
import { restartSituation } from "./simulation.reset.ts";
import { createMemoryStorage, createPostgresStorage, type SimulationStorage } from "./simulation.storage.ts";
import { telemetrySchema, type ChatEntry, type SimulationState, type SimulationUpdate } from "./simulation.ts";

const listCrew = () => getServices().crew.list();

async function initialState(): Promise<SimulationState> {
  return emptyState(buildCrew(await listCrew()));
}

function isState(value: unknown): value is SimulationState {
  const state = value as Partial<SimulationState> | null;
  return typeof state === "object" && state !== null && Array.isArray(state.crew) && Array.isArray(state.messages);
}

const globalForStore = globalThis as unknown as { somaSimulation?: SimulationStorage<SimulationState> };

function storage(): SimulationStorage<SimulationState> {
  globalForStore.somaSimulation ??= process.env.DATABASE_URL
    ? createPostgresStorage(getPool(), initialState, isState)
    : createMemoryStorage(initialState);
  return globalForStore.somaSimulation;
}

export async function getSimulation(): Promise<SimulationState> {
  const members = await listCrew();
  return storage().update((state) => reconcileCrew(state, members));
}

export async function updateSimulation(update: SimulationUpdate): Promise<SimulationState> {
  const members = await listCrew();
  return await storage().update(async (current) => {
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

async function notifyMembers(messages: ChatEntry[], provider: "medgemma" | "gemini" | undefined) {
  if (!process.env.DATABASE_URL || messages.length === 0) return;
  const analyst = PROVIDER_LABELS[provider ?? "medgemma"];
  const repository = getNotificationsRepository();
  for (const notification of instructionNotifications(messages, analyst)) {
    try {
      await repository.add(notification);
    } catch (error) {
      console.error("[simulation] could not notify", error);
    }
  }
}

async function evaluatePending() {
  while (true) {
    const state = await getSimulation();
    if (state.phase !== "pending") return;
    const result = await evaluateSimulation(state);
    let created: ChatEntry[] = [];
    await storage().update((current) => {
      created = [];
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
      created = messages;
      return {
        ...current,
        version,
        phase: "done",
        decision: result.value,
        incidentOpenedWith,
        messages: [...current.messages, ...messages].slice(-150),
      } satisfies SimulationState;
    });
    if (result.ok) await notifyMembers(created, result.value.provider);
  }
}

let worker: Promise<void> | undefined;

export function runPendingSimulation(): Promise<void> {
  return (worker ??= evaluatePending().finally(() => { worker = undefined; }));
}
