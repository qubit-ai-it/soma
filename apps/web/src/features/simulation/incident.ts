import { locationAt } from "./deck.ts";
import { type CrewId, type Decision, type EquipmentId, type SimCrew, type SimulationState, type Telemetry } from "./simulation.ts";

// Reference bands for the fictional exercise.
type AlertSignal = Exclude<keyof Telemetry, "sleepHours">;
const telemetryBands: Record<AlertSignal, { nominal: [number, number]; critical: (value: number) => boolean }> = {
  heartRateBpm: { nominal: [50, 100], critical: (v) => v <= 35 || v >= 150 },
  spo2Pct: { nominal: [95, 100], critical: (v) => v < 90 },
  systolic: { nominal: [90, 139], critical: (v) => v < 80 || v >= 180 },
  diastolic: { nominal: [60, 89], critical: (v) => v < 45 || v >= 120 },
  cumulativeDoseMsv: { nominal: [0, 150], critical: (v) => v >= 250 },
};
export const alertSignals = Object.keys(telemetryBands) as AlertSignal[];

export function assessTelemetry(telemetry: Telemetry) {
  return alertSignals.map((signal) => {
    const value = telemetry[signal];
    const { nominal: [min, max], critical } = telemetryBands[signal];
    const corrected = value >= min && value <= max;
    const severity = critical(value) ? "critical" : corrected ? "nominal" : "watch";
    return { signal, value, min, max, severity, corrected } as const;
  });
}

export function hasCriticalTelemetry(member: SimCrew) {
  return assessTelemetry(member.telemetry).some(({ severity }) => severity === "critical");
}

export function equipmentFor(telemetry: Telemetry): EquipmentId[] {
  const abnormal = assessTelemetry(telemetry).filter(({ corrected }) => !corrected);
  const critical = abnormal.filter(({ severity }) => severity === "critical");
  const signals = (critical.length ? critical : abnormal).map(({ signal }) => signal);
  const choices: EquipmentId[] = [];
  if (signals.includes("heartRateBpm")) choices.push(telemetry.heartRateBpm === 0 ? "desfibrilador" : "tensiometro");
  if (signals.includes("spo2Pct")) choices.push("oximetro");
  if (signals.includes("systolic") || signals.includes("diastolic")) choices.push("tensiometro");
  if (signals.includes("cumulativeDoseMsv")) choices.push("dosimetro");
  return [...new Set(choices)];
}

export function activeIncident(decision: Decision | null) {
  return decision?.status === "watch" || decision?.status === "critical" ? decision : null;
}

export function incidentProgress(state: SimulationState) {
  const decision = activeIncident(state.decision);
  const affected = state.crew.find(({ id }) => id === decision?.affectedCrewId);
  if (!decision || !affected) return null;

  const previousSignals = decision.signals ?? [];
  const sleepOnly = previousSignals.length > 0 && previousSignals.every((signal) => signal === "sleepHours");
  const destination = locationAt(affected.position);
  const arrivals = (sleepOnly ? [] : decision.instructions).flatMap((instruction) => {
    const member = state.crew.find(({ id }) => id === instruction.crewId);
    if (!instruction.destination || !member || hasCriticalTelemetry(member)) return [];
    return [{ crewId: member.id, destination,
      pickup: instruction.equipmentCollected === false ? instruction.via : null,
      arrived: locationAt(member.position) === destination && instruction.equipmentCollected !== false,
    }];
  });
  const assessed = assessTelemetry(affected.telemetry);
  const followUpSignals = assessed.filter(({ corrected }) => !corrected);
  const pulseIncident = state.incidentOpenedWith?.heartRateBpm === 0 && previousSignals.includes("heartRateBpm");
  const signals = pulseIncident ? ["heartRateBpm"] : previousSignals;
  return {
    affectedCrewId: affected.id,
    arrivals,
    readings: assessed.filter(({ signal }) => (
      signals.includes(signal) || followUpSignals.some((reading) => reading.signal === signal)
    )),
    followUpSignals,
    sleepOnly,
    severeFollowUp: followUpSignals.some(({ severity }) => severity === "critical"),
    canResolve: arrivals.every(({ arrived }) => arrived) && followUpSignals.length === 0,
  };
}

export function incidentOptions(state: SimulationState, progress = incidentProgress(state)): {
  statuses: readonly Decision["status"][];
  affectedIds: CrewId[];
} {
  const previous = activeIncident(state.decision);
  const inTransit = previous?.status === "critical" && progress?.arrivals.some(({ arrived }) => !arrived);
  const criticalIds = state.crew.filter(hasCriticalTelemetry).map(({ id }) => id);
  if (previous?.status === "critical" && progress && (inTransit || progress.severeFollowUp)) {
    return { statuses: ["critical"], affectedIds: [progress.affectedCrewId] };
  }
  if (criticalIds.length) return { statuses: ["critical"] as const, affectedIds: criticalIds };
  if (progress && !progress.followUpSignals.length) return { statuses: ["resolved"] as const, affectedIds: [] };
  const watchIds = progress ? [progress.affectedCrewId]
    : state.crew.filter(({ telemetry }) => assessTelemetry(telemetry).some(({ corrected }) => !corrected)).map(({ id }) => id);
  return watchIds.length
    ? { statuses: ["watch", "critical"] as const, affectedIds: watchIds }
    : { statuses: ["nominal"] as const, affectedIds: [] };
}

export function needsIncidentReview(state: SimulationState) {
  if (state.phase !== "done") return false;
  const progress = incidentProgress(state);
  return progress?.canResolve === true || progress?.sleepOnly === true
    || ((state.decision?.status !== "critical" || state.decision.equipmentId === undefined) && state.crew.some(hasCriticalTelemetry));
}

export function validIncidentTransition(state: SimulationState, next: Decision) {
  const { statuses, affectedIds } = incidentOptions(state);
  if (!statuses.some((status) => status === next.status)) return false;
  if (!next.affectedCrewId) return !affectedIds.length && !next.signals.length && !next.instructions.length;
  const affected = state.crew.find(({ id }) => id === next.affectedCrewId);
  if (!affected || !affectedIds.includes(affected.id)) return false;
  if (next.status === "watch" && next.instructions.length) return false;

  const abnormal = assessTelemetry(affected.telemetry).filter(({ corrected }) => !corrected);
  if (abnormal.length && (!next.signals.length || next.signals.some((signal) => !abnormal.some((item) => item.signal === signal)))) {
    return false;
  }
  const previous = activeIncident(state.decision);
  if (next.status !== "critical" || previous?.status !== "critical" || previous.affectedCrewId !== affected.id
      || incidentProgress(state)?.sleepOnly) return true;
  const destination = locationAt(affected.position);
  // An available responder already sent directly stays with this assignment.
  const direct = previous.instructions.find((instruction) => !instruction.via && instruction.destination === destination
    && state.crew.some((member) => member.id === instruction.crewId && !hasCriticalTelemetry(member)));
  return !direct || next.instructions.some((instruction) => instruction.crewId === direct.crewId
    && !instruction.via && instruction.destination === destination);
}
