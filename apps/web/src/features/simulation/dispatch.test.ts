import assert from "node:assert/strict";
import { test } from "node:test";
import { constrainToDeck, corridorFloors, locationAt, locationCenter, shortestWalk, walkableLocation } from "./deck.ts";
import { dispatchMessage, dispatchResponse } from "./dispatch.ts";
import { type CrewId, type Instruction, type SimCrew } from "./simulation.ts";

function member(id: CrewId, x: number, y: number, pulse = 72): SimCrew {
  return {
    id, name: id, role: "Crew member", position: { x, y }, updatedAt: null,
    telemetry: { heartRateBpm: pulse, spo2Pct: 98, systolic: 120, diastolic: 78, sleepHours: 7, cumulativeDoseMsv: 30 },
  };
}

test("the shortest exact position in the same module gets the direct assignment", () => {
  const affected = member("cm-a1", 16.4, 19.2, 0);
  const crew = [affected, member("cm-b2", 19.5, 18), member("cm-c3", 14.2, 18.3), member("cm-d4", 50, 75)];
  assert.deepEqual(dispatchResponse(crew, affected, "defibrillator").map(({ crewId, via }) => [crewId, via]), [
    ["cm-c3", null], ["cm-d4", "medical"],
  ]);
});

test("a responder across a nearby doorway can beat someone across the same room", () => {
  const affected = member("cm-a1", 32, 25, 0);
  const crew = [affected, member("cm-b2", 8, 25), member("cm-c3", 34, 25)];
  assert.equal(dispatchResponse(crew, affected, "defibrillator")[0]?.crewId, "cm-c3");
});

test("active assignments persist until a destination changes or a responder becomes unavailable", () => {
  const affected = member("cm-a1", 16, 25, 0);
  const first = member("cm-b2", 22, 25);
  const nearer = member("cm-c3", 17, 25);
  const equipment = member("cm-d4", 50, 75);
  const prior: Instruction[] = [
    { crewId: first.id, destination: "command", via: null, message: "Go to Command." },
    { crewId: equipment.id, destination: "command", via: "medical", message: "Bring the equipment to Command." },
  ];
  assert.equal(dispatchResponse([affected, first, nearer, equipment], affected, "defibrillator", prior)[0]?.crewId, first.id);
  const unavailable = { ...first, telemetry: { ...first.telemetry, heartRateBpm: 0 } };
  assert.deepEqual(dispatchResponse([affected, unavailable, nearer, equipment], affected, "defibrillator", prior).map(({ crewId }) => crewId), [
    nearer.id, equipment.id,
  ]);
});

test("only the equipment assignment names the defibrillator", () => {
  const responder = dispatchMessage("laboratory", "Ada", null, ["heartRateBpm"]);
  const equipment = dispatchMessage("laboratory", "Ada", "defibrillator");
  assert.match(responder, /Go immediately to the module Laboratory to assist Ada/);
  assert.match(responder, /check whether they respond and how they breathe/);
  assert.match(responder, /In the exercise record, verify pulse/);
  assert.doesNotMatch(responder, /defibrillator/);
  assert.match(equipment, /Pick up the defibrillator from Medical area and bring it to the module Laboratory/);
  assert.match(equipment, /hand the equipment to whoever is assisting/);
});

test("the first responder is told which readings to verify in the exercise", () => {
  const affected = member("cm-a1", 80, 25);
  const crew = [affected, member("cm-b2", 85, 25), member("cm-c3", 50, 75)];
  const [direct, carrier] = dispatchResponse(crew, affected, "oximeter", [], ["spo2Pct", "systolic", "diastolic"]);
  assert.match(direct.message, /verify oxygen saturation and systolic and diastolic pressure/);
  assert.equal(direct.message.match(/pressure/g)?.length, 1);
  assert.doesNotMatch(direct.message, /oximeter/);
  assert.match(carrier.message, /Pick up the oximeter/);
});

test("visible routes project outer positions onto the floor and cross rooms in a corridor", () => {
  const [start, exit, entry, finish] = shortestWalk({ x: 2, y: 2 }, { x: 62, y: 4 }).path;
  assert.ok(start.x > 2 && start.y > 2);
  assert.ok(finish.x < 62 && finish.y > 4);
  assert.equal(exit.y, entry.y);
  assert.ok(corridorFloors.some(({ left, top, width, height }) => (
    [exit, entry].every(({ x, y }) => x >= left && x <= left + width && y >= top && y <= top + height)
  )));
});

test("empty gaps and exterior corners snap to a walkable floor", () => {
  for (const point of [{ x: 2, y: 2 }, { x: 34, y: 40 }, { x: 65, y: 52 }, { x: 98, y: 98 }]) {
    assert.equal(walkableLocation(point), null);
    const fitted = constrainToDeck(point);
    assert.ok(walkableLocation(fitted));
    assert.equal(constrainToDeck(fitted), fitted);
  }
});

test("numbered corridors are independently detected and their routes stay on the deck", () => {
  const destination = locationCenter("corridor-2");
  assert.equal(locationAt(destination), "corridor-2");
  const paths = [shortestWalk({ x: 18, y: 71 }, destination), shortestWalk(destination, locationCenter("corridor-4"))];
  for (const { path } of paths) {
    assert.ok(Number.isFinite(shortestWalk(path[0], path.at(-1)!).distance));
    for (let index = 1; index < path.length; index++) {
      const a = path[index - 1];
      const b = path[index];
      for (const ratio of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        assert.ok(walkableLocation({ x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio }));
      }
    }
  }
  const affected = { ...member("cm-a1", destination.x, destination.y, 0), name: "Ada" };
  const [direct, carrier] = dispatchResponse([affected, member("cm-b2", 55, 24), member("cm-c3", 50, 75)], affected, "defibrillator");
  assert.equal(direct.destination, "corridor-2");
  assert.match(direct.message, /to the Corridor 2/);
  assert.match(carrier.message, /to the Corridor 2/);
});

test("equipment can come from Engineering and a direct response can have no equipment", () => {
  const affected = member("cm-a1", 80, 27);
  const crew = [affected, member("cm-b2", 81, 25), member("cm-c3", 83, 75), member("cm-d4", 50, 75)];
  const [direct, carrier] = dispatchResponse(crew, affected, "dosimeter");
  assert.equal(direct.via, null);
  assert.doesNotMatch(direct.message, /dosimeter/);
  assert.equal(carrier.crewId, "cm-c3");
  assert.equal(carrier.via, "engineering");
  assert.equal(carrier.equipmentCollected, true);
  assert.match(carrier.message, /dosimeter from Engineering/);
  const withoutEquipment = dispatchResponse(crew, affected, null);
  assert.equal(withoutEquipment.length, 2);
  assert.equal(withoutEquipment[0].crewId, direct.crewId);
  assert.notEqual(withoutEquipment[1].crewId, direct.crewId);
  assert.equal(withoutEquipment[1].via, null);
});
