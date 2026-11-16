import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { THRESHOLDS, deriveFlags } from "./crew.logic.ts";
import { crewMemberSchema } from "./crew.schema.ts";
import { fullName, generateCrewVitals, pickTitle, type CrewAppRole } from "./crew.generate.ts";

const NOW = new Date("2026-11-16T12:00:00Z");
const ROLES: CrewAppRole[] = ["astronaut", "cmo", "commander"];

describe("generateCrewVitals", () => {
  it("is deterministic for the same seed and different for another", () => {
    const a = generateCrewVitals("user-a", "astronaut", NOW);
    assert.deepEqual(generateCrewVitals("user-a", "astronaut", NOW), a);
    assert.notDeepEqual(generateCrewVitals("user-b", "astronaut", NOW).vitals, a.vitals);
  });

  it("keeps every value inside plausible thresholds and raises no flag", () => {
    for (let n = 0; n < 200; n++) {
      for (const role of ROLES) {
        const generated = generateCrewVitals(`user-${n}`, role, NOW);
        const member = {
          id: "cm-test",
          name: "Test Person",
          role: pickTitle(`user-${n}`, role),
          vitals: generated.vitals,
          history: generated.history,
          cumulativeDoseMsv: generated.cumulativeDoseMsv,
          lastCheckIn: generated.lastCheckIn,
        };
        assert.ok(crewMemberSchema.safeParse(member).success, `${role} ${n}`);
        for (const sample of [generated.vitals, ...generated.history]) {
          assert.ok(sample.heartRateBpm >= 45 && sample.heartRateBpm <= 80, `hr ${sample.heartRateBpm}`);
          assert.ok(sample.spo2Pct >= 95 && sample.spo2Pct <= 100, `spo2 ${sample.spo2Pct}`);
          assert.ok(sample.sleepHours >= 6.2 && sample.sleepHours <= 8.5, `sleep ${sample.sleepHours}`);
        }
        assert.ok(generated.cumulativeDoseMsv > 0 && generated.cumulativeDoseMsv < THRESHOLDS.maxDoseMsv);
        assert.deepEqual(deriveFlags(member), []);
      }
    }
  });

  it("builds a five-day history that ends at the current vitals", () => {
    const generated = generateCrewVitals("user-x", "cmo", NOW);
    assert.equal(generated.history.length, 5);
    const last = generated.history[4];
    assert.deepEqual(
      generated.vitals,
      { heartRateBpm: last.heartRateBpm, spo2Pct: last.spo2Pct, sleepHours: last.sleepHours },
    );
    assert.ok(new Date(generated.lastCheckIn).getTime() <= NOW.getTime());
  });
});

describe("naming", () => {
  it("joins first and last name and ignores empty parts", () => {
    assert.equal(fullName(" Ana ", "Lopez"), "Ana Lopez");
    assert.equal(fullName("Ana", ""), "Ana");
  });

  it("picks a title that belongs to the role", () => {
    assert.equal(pickTitle("u", "commander"), "Commander");
    assert.equal(pickTitle("u", "cmo"), "Flight Surgeon");
  });
});
