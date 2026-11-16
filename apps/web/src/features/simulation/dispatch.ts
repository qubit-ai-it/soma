import { hasCriticalTelemetry } from "./incident.ts";
import { isCorridor, locationAt, locationNames, shortestWalk } from "./deck.ts";
import { equipment, roomCenter, rooms, type EquipmentId, type Instruction, type LocationId, type Point, type RoomId, type SimCrew, type Telemetry } from "./simulation.ts";

const readingLabels: Partial<Record<keyof Telemetry, string>> = {
  heartRateBpm: "el pulso",
  spo2Pct: "la saturación de oxígeno",
  systolic: "la presión sistólica y diastólica",
  diastolic: "la presión sistólica y diastólica",
  cumulativeDoseMsv: "la dosis acumulada",
};
const readingList = new Intl.ListFormat("es", { type: "conjunction" });

export function dispatchMessage(
  destination: LocationId,
  affectedName: string,
  equipmentId: EquipmentId | null = null,
  signals: readonly (keyof Telemetry)[] = [],
) {
  const location = isCorridor(destination) ? locationNames[destination] : `módulo ${rooms[destination]}`;
  if (equipmentId) {
    const tool = equipment[equipmentId];
    return `Recoge el ${tool.label.toLowerCase()} en ${rooms[tool.room]} y llévalo al ${location}, donde está ${affectedName}. Al llegar, entrega el equipo a quien está asistiendo y confirma la entrega al operador del ejercicio.`;
  }

  const readings = [...new Set(signals.map((signal) => readingLabels[signal]).filter((label) => label !== undefined))];
  const report = readings.length
    ? `En la ficha del ejercicio, verifica ${readingList.format(readings)} y comunica las lecturas al operador.`
    : "Comunica al operador del ejercicio lo que observas.";
  return `Ve de inmediato al ${location} para asistir a ${affectedName}. Al llegar, comprueba si responde y cómo respira. Si no responde o no respira con normalidad, avisa de inmediato al operador del ejercicio. ${report} Quédate a su lado y avisa si cambia su estado.`;
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
