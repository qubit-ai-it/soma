import { hasCriticalTelemetry } from "./incident.ts";
import {
  corridors, equipment, roomAt, roomCenter, roomIds, rooms,
  type EquipmentId, type Instruction, type Point, type RoomId, type SimCrew,
} from "./simulation.ts";

function deckDistance(from: Point, to: Point) {
  // The normalized deck is three modules wide and two modules high.
  return Math.hypot((to.x - from.x) * 1.5, to.y - from.y);
}

export function roomFloor(room: RoomId) {
  const center = roomCenter(room);
  return { left: center.x - 15, top: center.y - 21, width: 30, height: 42 };
}

function doorway(room: RoomId, towards: RoomId): Point {
  const center = roomCenter(room);
  const neighbor = roomCenter(towards);
  const floor = roomFloor(room);
  return {
    x: center.x + Math.sign(neighbor.x - center.x) * floor.width / 2,
    y: center.y + Math.sign(neighbor.y - center.y) * floor.height / 2,
  };
}

export const corridorFloors = corridors.filter(([from, to]) => roomIds.indexOf(from) < roomIds.indexOf(to))
  .map(([from, to]) => {
    const start = doorway(from, to);
    const end = doorway(to, from);
    return { left: Math.min(start.x, end.x) - 3, top: Math.min(start.y, end.y) - 3,
      width: Math.abs(start.x - end.x) + 6, height: Math.abs(start.y - end.y) + 6 };
  });

function insideFloor(point: Point): Point {
  const room = roomAt(point);
  const center = roomCenter(room);
  const floor = roomFloor(room);
  const x = point.x - center.x;
  const y = point.y - center.y;
  const scale = Math.max(1, Math.hypot(x / (floor.width / 2 - 1), y / (floor.height / 2 - 1)));
  return { x: center.x + x / scale, y: center.y + y / scale };
}

function shortestWalk(start: Point, destination: Point) {
  const target = roomAt(destination);

  function search(room: RoomId, position: Point, visited: RoomId[]): { path: Point[]; distance: number } {
    if (room === target) return { path: [position, destination], distance: deckDistance(position, destination) };
    let best = { path: [] as Point[], distance: Infinity };
    for (const [from, to] of corridors) {
      if (from !== room || visited.includes(to)) continue;
      const exit = doorway(room, to);
      const entry = doorway(to, room);
      const remaining = search(to, entry, [...visited, to]);
      const distance = deckDistance(position, exit) + deckDistance(exit, entry) + remaining.distance;
      if (distance < best.distance) best = { path: [position, exit, ...remaining.path], distance };
    }
    return best;
  }

  const origin = roomAt(start);
  return search(origin, start, [origin]);
}

export function walkingPath(start: Point, destination: Point) {
  return shortestWalk(insideFloor(start), insideFloor(destination)).path;
}

export function dispatchMessage(destination: RoomId, affectedName: string, equipmentId: EquipmentId | null = null) {
  const location = rooms[destination];
  const tool = equipmentId && equipment[equipmentId];
  return tool
    ? `Recoge el ${tool.label.toLowerCase()} en ${rooms[tool.room]} y llévalo al módulo ${location}, donde está ${affectedName}.`
    : `Ve de inmediato al módulo ${location} para asistir a ${affectedName}.`;
}

export function dispatchResponse(crew: SimCrew[], affected: SimCrew, equipmentId: EquipmentId | null, previous: Instruction[] = []): Instruction[] {
  const destination = roomAt(affected.position);
  const pickup = equipmentId && equipment[equipmentId].room;
  const candidates = crew.filter((member) => member.id !== affected.id && !hasCriticalTelemetry(member));
  const keep = (via: RoomId | null) => previous.find((instruction) => instruction.destination === destination
    && instruction.via === via && candidates.some(({ id }) => id === instruction.crewId))?.crewId;
  const nearest = (point: Point, excluded?: SimCrew["id"]) => candidates
    .filter(({ id }) => id !== excluded)
    .map(({ id, position }) => ({ id, distance: shortestWalk(position, point).distance }))
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0]?.id;

  const assignedEquipment = pickup && candidates.length >= 2 ? keep(pickup) : undefined;
  const direct = keep(null) ?? nearest(affected.position, assignedEquipment);
  if (!direct) return [];

  const assignments: Instruction[] = [{ crewId: direct, destination, via: null, message: dispatchMessage(destination, affected.name) }];
  if (pickup) {
    const carrier = assignedEquipment ?? nearest(roomCenter(pickup), direct);
    const member = candidates.find(({ id }) => id === carrier);
    if (member) assignments.push({
      crewId: member.id, destination, via: pickup, message: dispatchMessage(destination, affected.name, equipmentId),
      equipmentCollected: roomAt(member.position) === pickup || previous.some((instruction) => (
        instruction.crewId === member.id && instruction.via === pickup && instruction.equipmentCollected === true
      )),
    });
  }
  return assignments;
}
