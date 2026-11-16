import { hasCriticalTelemetry } from "./incident.ts";
import { isCorridor, locationAt, locationNames, shortestWalk } from "./deck.ts";
import { equipment, roomCenter, rooms, type EquipmentId, type Instruction, type LocationId, type Point, type RoomId, type SimCrew, type Telemetry } from "./simulation.ts";

const readingLabels: Partial<Record<keyof Telemetry, string>> = {
  heartRateBpm: "pulse",
  spo2Pct: "oxygen saturation",
  systolic: "systolic and diastolic pressure",
  diastolic: "systolic and diastolic pressure",
  cumulativeDoseMsv: "cumulative dose",
};
const readingList = new Intl.ListFormat("en", { type: "conjunction" });

export function dispatchMessage(
  destination: LocationId,
  affectedName: string,
  equipmentId: EquipmentId | null = null,
  signals: readonly (keyof Telemetry)[] = [],
) {
  const location = isCorridor(destination) ? locationNames[destination] : `module ${rooms[destination]}`;
  if (equipmentId) {
    const tool = equipment[equipmentId];
    return `Pick up the ${tool.label.toLowerCase()} from ${rooms[tool.room]} and bring it to the ${location}, where ${affectedName} is. On arrival, hand the equipment to whoever is assisting and confirm the handoff to the exercise operator.`;
  }

  const readings = [...new Set(signals.map((signal) => readingLabels[signal]).filter((label) => label !== undefined))];
  const report = readings.length
    ? `In the exercise record, verify ${readingList.format(readings)} and report the readings to the operator.`
    : "Report to the exercise operator what you observe.";
  return `Go immediately to the ${location} to assist ${affectedName}. On arrival, check whether they respond and how they breathe. If they do not respond or are not breathing normally, alert the exercise operator immediately. ${report} Stay by their side and report if their condition changes.`;
}

export function dispatchResponse(
  crew: SimCrew[],
  affected: SimCrew,
  equipmentId: EquipmentId | null,
  previous: Instruction[] = [],
  signals: readonly (keyof Telemetry)[] = [],
): Instruction[] {
  const destination = locationAt(affected.position);
  const pickup = equipmentId && equipment[equipmentId].room;
  const candidates = crew.filter((member) => member.id !== affected.id && !hasCriticalTelemetry(member));
  const keep = (via: RoomId | null, excluded?: SimCrew["id"]) => previous.find((instruction) => instruction.destination === destination
    && instruction.via === via && instruction.crewId !== excluded
    && candidates.some(({ id }) => id === instruction.crewId))?.crewId;
  const nearest = (point: Point, excluded?: SimCrew["id"]) => candidates
    .filter(({ id }) => id !== excluded)
    .map(({ id, position }) => ({ id, distance: shortestWalk(position, point).distance }))
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0]?.id;

  const assignedEquipment = pickup && candidates.length >= 2 ? keep(pickup) : undefined;
  const direct = keep(null) ?? nearest(affected.position, assignedEquipment);
  if (!direct) return [];

  const assignments: Instruction[] = [{
    crewId: direct, destination, via: null, message: dispatchMessage(destination, affected.name, null, signals),
  }];
  const second = pickup
    ? assignedEquipment ?? nearest(roomCenter(pickup), direct)
    : keep(null, direct) ?? nearest(affected.position, direct);
  const member = candidates.find(({ id }) => id === second && id !== direct);
  if (member) assignments.push({
    crewId: member.id, destination, via: pickup || null,
    message: dispatchMessage(destination, affected.name, equipmentId, signals),
    equipmentCollected: pickup ? locationAt(member.position) === pickup || previous.some((instruction) => (
      instruction.crewId === member.id && instruction.via === pickup && instruction.equipmentCollected === true
    )) : undefined,
  });
  return assignments;
}
