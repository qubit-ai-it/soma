import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { attentionFor, deriveFlags, toCrewCard } from "./crew.logic.ts";
import type { CrewMember } from "./crew.types.ts";

const nominal: CrewMember = {
  id: "cm-x",
  name: "Test Member",
  role: "Tester",
  vitals: { heartRateBpm: 70, spo2Pct: 98, sleepHours: 7 },
  cumulativeDoseMsv: 20,
  lastCheckIn: "2026-10-31T06:00:00Z",
};

describe("crew logic", () => {
  it("raises no flags for nominal vitals", () => {
    assert.deepEqual(deriveFlags(nominal), []);
    assert.equal(toCrewCard(nominal).attention, "nominal");
  });

  it("flags each out-of-range signal with its own code", () => {
    const member: CrewMember = {
      ...nominal,
      vitals: { heartRateBpm: 110, spo2Pct: 90, sleepHours: 4 },
      cumulativeDoseMsv: 150,
    };
    assert.deepEqual(
      deriveFlags(member).map((flag) => flag.code),
      ["low-spo2", "high-heart-rate", "short-sleep", "high-dose"],
    );
  });

  it("treats values exactly on the threshold as in range", () => {
    const member: CrewMember = {
      ...nominal,
      vitals: { heartRateBpm: 100, spo2Pct: 94, sleepHours: 6 },
      cumulativeDoseMsv: 100,
    };
    assert.deepEqual(deriveFlags(member), []);
  });

  it("maps flag count to attention level", () => {
    assert.equal(attentionFor([]), "nominal");
    assert.equal(attentionFor([{ code: "short-sleep", label: "x" }]), "watch");
    assert.equal(
      attentionFor([
        { code: "short-sleep", label: "x" },
        { code: "low-spo2", label: "y" },
      ]),
      "review",
    );
  });
});
