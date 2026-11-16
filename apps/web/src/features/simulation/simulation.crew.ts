import type { CrewMember } from "../crew/crew.types.ts";
import { randomCrewPositions } from "./deck.ts";
import type { Point, SimCrew, SimulationState } from "./simulation.ts";

const systolic = 120;
const diastolic = 78;

export function toSimCrew(member: CrewMember, position: Point): SimCrew {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    position,
    updatedAt: null,
    telemetry: {
      heartRateBpm: member.vitals.heartRateBpm,
      spo2Pct: member.vitals.spo2Pct,
      sleepHours: member.vitals.sleepHours,
      cumulativeDoseMsv: member.cumulativeDoseMsv,
      systolic,
      diastolic,
    },
  };
}

export function buildCrew(members: CrewMember[], positions = randomCrewPositions(members.length)): SimCrew[] {
  return members.map((member, index) => toSimCrew(member, positions[index]));
}

export function emptyState(crew: SimCrew[]): SimulationState {
  return { revision: 0, version: 0, phase: "idle", changes: [], decision: null, messages: [], crew };
}

// Keeps the session state of members that still exist, adds new ones, drops the rest
export function reconcileCrew(state: SimulationState, members: CrewMember[]): SimulationState {
  const known = new Map(state.crew.map((member) => [member.id, member]));
  const unchanged = members.length === state.crew.length && members.every(({ id }, index) => state.crew[index]?.id === id);
  if (unchanged) return state;

  const fresh = members.filter(({ id }) => !known.has(id));
  const positions = randomCrewPositions(fresh.length);
  const crew = members.map((member) => known.get(member.id) ?? toSimCrew(member, positions[fresh.indexOf(member)]));
  const ids = new Set(crew.map(({ id }) => id));
  const affectedGone = state.decision?.affectedCrewId != null && !ids.has(state.decision.affectedCrewId);
  return {
    ...state,
    crew,
    version: state.version + 1,
    revision: state.revision + 1,
    messages: state.messages.filter(({ crewId }) => ids.has(crewId)),
    changes: state.changes.filter(({ crewId }) => ids.has(crewId)),
    decision: affectedGone ? null : state.decision && {
      ...state.decision,
      instructions: state.decision.instructions.filter(({ crewId }) => ids.has(crewId)),
    },
    incidentOpenedWith: affectedGone ? undefined : state.incidentOpenedWith,
    phase: crew.length === 0 ? "idle" : affectedGone || state.phase === "pending" ? "pending" : state.phase,
  };
}
