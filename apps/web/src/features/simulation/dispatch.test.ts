import assert from "node:assert/strict";
import { test } from "node:test";
import { corridorFloors, dispatchMessage, dispatchResponse, walkingPath } from "./dispatch.ts";
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
  const responder = dispatchMessage("laboratorio", "Lucía");
  const equipment = dispatchMessage("laboratorio", "Lucía", "desfibrilador");
  assert.match(responder, /Ve de inmediato al módulo Laboratorio para asistir a Lucía/);
  assert.doesNotMatch(responder, /desfibrilador/);
  assert.match(equipment, /Recoge el desfibrilador en Área médica y llévalo al módulo Laboratorio/);
});

test("visible routes project outer positions onto the floor and cross rooms in a corridor", () => {
  const [start, exit, entry, finish] = walkingPath({ x: 2, y: 2 }, { x: 62, y: 4 });
  assert.ok(start.x > 2 && start.y > 2);
  assert.ok(finish.x < 62 && finish.y > 4);
  assert.equal(exit.y, entry.y);
  assert.ok(corridorFloors.some(({ left, top, width, height }) => (
    [exit, entry].every(({ x, y }) => x >= left && x <= left + width && y >= top && y <= top + height)
  )));
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
