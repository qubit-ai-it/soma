import assert from "node:assert/strict";
import { test } from "node:test";
import { constrainToDeck, corridorFloors, locationAt, locationCenter, shortestWalk, walkableLocation } from "./deck.ts";
import { dispatchMessage, dispatchResponse } from "./dispatch.ts";
import { type CrewId, type Instruction, type SimCrew } from "./simulation.ts";

function member(id: CrewId, x: number, y: number, pulse = 72): SimCrew {
  return {
    id, name: id, role: "Tripulante", position: { x, y }, updatedAt: null,
    telemetry: { heartRateBpm: pulse, spo2Pct: 98, systolic: 120, diastolic: 78, sleepHours: 7, cumulativeDoseMsv: 30 },
  };
}

test("the shortest exact position in the same module gets the direct assignment", () => {
  const affected = member("cm-01", 16.4, 19.2, 0);
  const crew = [affected, member("cm-02", 19.5, 18), member("cm-03", 14.2, 18.3), member("cm-04", 50, 75)];
  assert.deepEqual(dispatchResponse(crew, affected, "desfibrilador").map(({ crewId, via }) => [crewId, via]), [
    ["cm-03", null], ["cm-04", "medica"],
  ]);
});

test("a responder across a nearby doorway can beat someone across the same room", () => {
  const affected = member("cm-01", 32, 25, 0);
  const crew = [affected, member("cm-02", 8, 25), member("cm-03", 34, 25)];
  assert.equal(dispatchResponse(crew, affected, "desfibrilador")[0]?.crewId, "cm-03");
});

test("active assignments persist until a destination changes or a responder becomes unavailable", () => {
  const affected = member("cm-01", 16, 25, 0);
  const first = member("cm-02", 22, 25);
  const nearer = member("cm-03", 17, 25);
  const equipment = member("cm-04", 50, 75);
  const prior: Instruction[] = [
    { crewId: first.id, destination: "mando", via: null, message: "Ve a Mando." },
    { crewId: equipment.id, destination: "mando", via: "medica", message: "Lleva el equipo a Mando." },
  ];
  assert.equal(dispatchResponse([affected, first, nearer, equipment], affected, "desfibrilador", prior)[0]?.crewId, first.id);
  const unavailable = { ...first, telemetry: { ...first.telemetry, heartRateBpm: 0 } };
  assert.deepEqual(dispatchResponse([affected, unavailable, nearer, equipment], affected, "desfibrilador", prior).map(({ crewId }) => crewId), [
    nearer.id, equipment.id,
  ]);
});

test("only the equipment assignment names the defibrillator", () => {
  const responder = dispatchMessage("laboratorio", "Lucía", null, ["heartRateBpm"]);
  const equipment = dispatchMessage("laboratorio", "Lucía", "desfibrilador");
  assert.match(responder, /Ve de inmediato al módulo Laboratorio para asistir a Lucía/);
  assert.match(responder, /comprueba si responde y cómo respira/);
  assert.match(responder, /En la ficha del ejercicio, verifica el pulso/);
  assert.doesNotMatch(responder, /desfibrilador/);
  assert.match(equipment, /Recoge el desfibrilador en Área médica y llévalo al módulo Laboratorio/);
  assert.match(equipment, /entrega el equipo a quien está asistiendo/);
});

test("the first responder is told which readings to verify in the exercise", () => {
  const affected = member("cm-01", 80, 25);
  const crew = [affected, member("cm-02", 85, 25), member("cm-03", 50, 75)];
  const [direct, carrier] = dispatchResponse(crew, affected, "oximetro", [], ["spo2Pct", "systolic", "diastolic"]);
  assert.match(direct.message, /verifica la saturación de oxígeno y la presión sistólica y diastólica/);
  assert.equal(direct.message.match(/presión/g)?.length, 1);
  assert.doesNotMatch(direct.message, /oxímetro/);
  assert.match(carrier.message, /Recoge el oxímetro/);
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
  const destination = locationCenter("pasillo-2");
  assert.equal(locationAt(destination), "pasillo-2");
  const paths = [shortestWalk({ x: 18, y: 71 }, destination), shortestWalk(destination, locationCenter("pasillo-4"))];
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
  const affected = { ...member("cm-01", destination.x, destination.y, 0), name: "Amara" };
  const [direct, carrier] = dispatchResponse([affected, member("cm-02", 55, 24), member("cm-03", 50, 75)], affected, "desfibrilador");
  assert.equal(direct.destination, "pasillo-2");
  assert.match(direct.message, /al Pasillo 2/);
  assert.match(carrier.message, /al Pasillo 2/);
});

test("equipment can come from Engineering and a direct response can have no equipment", () => {
  const affected = member("cm-01", 80, 27);
  const crew = [affected, member("cm-02", 81, 25), member("cm-03", 83, 75), member("cm-04", 50, 75)];
  const [direct, carrier] = dispatchResponse(crew, affected, "dosimetro");
  assert.equal(direct.via, null);
  assert.doesNotMatch(direct.message, /dosímetro/);
  assert.equal(carrier.crewId, "cm-03");
  assert.equal(carrier.via, "ingenieria");
  assert.equal(carrier.equipmentCollected, true);
  assert.match(carrier.message, /dosímetro en Ingeniería/);
  assert.deepEqual(dispatchResponse(crew, affected, null), [direct]);
});
