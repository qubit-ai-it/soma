import { corridorIds, roomCenter, roomIds, rooms, type CorridorId, type LocationId, type Point, type RoomId } from "./simulation.ts";

export type DeckFloor = { left: number; top: number; width: number; height: number };
const roomCorners: Record<RoomId, readonly [number, number]> = {
  mando: [13, 19], pasillo: [10, 13], laboratorio: [13, 19],
  habitat: [13, 17], medica: [9, 12], ingenieria: [12, 17],
};

export function roomFloor(room: RoomId) {
  const center = roomCenter(room);
  const [radiusX, radiusY] = roomCorners[room];
  return { id: room, left: center.x - 15, top: center.y - 21, width: 30, height: 42, radiusX, radiusY };
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

const links = [
  ["mando", "pasillo"], ["pasillo", "laboratorio"],
  ["habitat", "medica"], ["medica", "ingenieria"],
  ["mando", "habitat"], ["pasillo", "medica"], ["laboratorio", "ingenieria"],
] as const satisfies readonly (readonly [RoomId, RoomId])[];

export const corridorFloors = links.map(([from, to], index) => {
  const start = doorway(from, to);
  const end = doorway(to, from);
  return { id: corridorIds[index], number: index + 1, from, to, start, end,
    left: Math.min(start.x, end.x) - 3, top: Math.min(start.y, end.y) - 3,
    width: Math.abs(start.x - end.x) + 6, height: Math.abs(start.y - end.y) + 6 };
});

const roomFloors = roomIds.map(roomFloor);
const corridorsById = new Map(corridorFloors.map((floor) => [floor.id, floor]));

export const locationNames = Object.fromEntries([
  ...Object.entries(rooms),
  ...corridorFloors.map(({ id, number }) => [id, `Pasillo ${number}`]),
]) as Record<LocationId, string>;

export function isCorridor(id: LocationId): id is CorridorId {
  return id.startsWith("pasillo-");
}

function floorCenter({ left, top, width, height }: DeckFloor): Point {
  return { x: left + width / 2, y: top + height / 2 };
}

export function locationCenter(id: LocationId) {
  return isCorridor(id) ? floorCenter(corridorsById.get(id)!) : roomCenter(id);
}

function contains(floor: DeckFloor, point: Point) {
  return point.x >= floor.left && point.x <= floor.left + floor.width
    && point.y >= floor.top && point.y <= floor.top + floor.height;
}

function inRoom(floor: ReturnType<typeof roomFloor>, point: Point) {
  if (!contains(floor, point)) return false;
  const center = floorCenter(floor);
  const x = Math.max(0, Math.abs(point.x - center.x) - (floor.width / 2 - floor.radiusX));
  const y = Math.max(0, Math.abs(point.y - center.y) - (floor.height / 2 - floor.radiusY));
  return (x / floor.radiusX) ** 2 + (y / floor.radiusY) ** 2 <= 1;
}

export function walkableLocation(point: Point): LocationId | null {
  return roomFloors.find((floor) => inRoom(floor, point))?.id
    ?? corridorFloors.find((floor) => contains(floor, point))?.id ?? null;
}

function deckDistance(from: Point, to: Point) {
  // The normalized deck is three modules wide and two modules high.
  return Math.hypot((to.x - from.x) * 1.5, to.y - from.y);
}

function constrainToRoom(floor: ReturnType<typeof roomFloor>, point: Point) {
  const center = floorCenter(floor);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  let inside = 0;
  let outside = 1;
  for (let step = 0; step < 18; step++) {
    const ratio = (inside + outside) / 2;
    if (inRoom(floor, { x: center.x + dx * ratio, y: center.y + dy * ratio })) inside = ratio;
    else outside = ratio;
  }
  return { x: center.x + dx * inside, y: center.y + dy * inside };
}

export function constrainToDeck(point: Point): Point {
  if (walkableLocation(point)) return point;
  const projections = [
    ...roomFloors.map((floor) => constrainToRoom(floor, point)),
    ...corridorFloors.map(({ left, top, width, height }) => ({
      x: Math.min(left + width, Math.max(left, point.x)),
      y: Math.min(top + height, Math.max(top, point.y)),
    })),
  ];
  return projections.reduce((closest, candidate) =>
    deckDistance(candidate, point) < deckDistance(closest, point) ? candidate : closest,
  );
}

export function locationAt(point: Point): LocationId {
  return walkableLocation(constrainToDeck(point))!;
}

type Walk = { path: Point[]; distance: number };

function roomWalk(room: RoomId, target: RoomId, start: Point, end: Point, visited: RoomId[] = [room]): Walk {
  if (room === target) return { path: [start, end], distance: deckDistance(start, end) };
  let best: Walk = { path: [], distance: Infinity };
  for (const corridor of corridorFloors) {
    const forward = corridor.from === room;
    if (!forward && corridor.to !== room) continue;
    const next = forward ? corridor.to : corridor.from;
    if (visited.includes(next)) continue;
    const exit = forward ? corridor.start : corridor.end;
    const entry = forward ? corridor.end : corridor.start;
    const remaining = roomWalk(next, target, entry, end, [...visited, next]);
    const distance = deckDistance(start, exit) + deckDistance(exit, entry) + remaining.distance;
    if (distance < best.distance) best = { path: [start, exit, ...remaining.path], distance };
  }
  return best;
}

function roomAnchors(location: LocationId, position: Point) {
  if (!isCorridor(location)) return [{ room: location, point: position }];
  const corridor = corridorsById.get(location)!;
  return [
    { room: corridor.from, point: corridor.start },
    { room: corridor.to, point: corridor.end },
  ];
}

export function shortestWalk(origin: Point, destination: Point): Walk {
  const start = constrainToDeck(origin);
  const end = constrainToDeck(destination);
  const from = walkableLocation(start)!;
  const to = walkableLocation(end)!;
  if (from === to) return { path: [start, end], distance: deckDistance(start, end) };

  let best: Walk = { path: [], distance: Infinity };
  for (const entry of roomAnchors(from, start)) {
    for (const exit of roomAnchors(to, end)) {
      const walk = roomWalk(entry.room, exit.room, entry.point, exit.point);
      const distance = deckDistance(start, entry.point) + walk.distance + deckDistance(exit.point, end);
      if (distance < best.distance) {
        const path = [...(isCorridor(from) ? [start] : []), ...walk.path, ...(isCorridor(to) ? [end] : [])];
        best = { path, distance };
      }
    }
  }
  return best;
}
