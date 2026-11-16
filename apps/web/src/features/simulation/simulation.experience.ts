import type { SimulationState } from "./simulation.ts";

export const CARDIAC_ARREST_MAX_BPM = 20;

export const CPR_EXPERIENCE = {
  id: "cpr",
  title: "CPR guided experience",
  href: "/experience/cpr",
  videoKey: "vr-rcp.mp4",
} as const;

export type ArrestIncident = { crewId: string; name: string };

export function cardiacArrestIncident(
  state: Pick<SimulationState, "crew" | "decision" | "incidentOpenedWith">,
): ArrestIncident | null {
  const decision = state.decision;
  if (decision?.status !== "critical" || !decision.affectedCrewId) return null;
  const affected = state.crew.find(({ id }) => id === decision.affectedCrewId);
  if (!affected) return null;
  const pulse = Math.min(affected.telemetry.heartRateBpm, state.incidentOpenedWith?.heartRateBpm ?? Infinity);
  return pulse <= CARDIAC_ARREST_MAX_BPM ? { crewId: affected.id, name: affected.name } : null;
}
