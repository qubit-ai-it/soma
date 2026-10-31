import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { crewFileSchema } from "./crew.schema.ts";

const member = {
  id: "cm-x",
  name: "Test Member",
  role: "Tester",
  vitals: { heartRateBpm: 70, spo2Pct: 98, sleepHours: 7 },
  cumulativeDoseMsv: 20,
  lastCheckIn: "2026-10-31T06:00:00Z",
};

describe("crew schema history", () => {
  it("accepts a member with a valid history", () => {
    const sample = { at: "2026-10-30T06:00:00Z", heartRateBpm: 70, spo2Pct: 98, sleepHours: 7 };
    assert.ok(crewFileSchema.safeParse({ crew: [{ ...member, history: [sample] }] }).success);
  });

  it("rejects a malformed history sample", () => {
    const bad = { at: "yesterday", heartRateBpm: 70, spo2Pct: 140, sleepHours: 7 };
    assert.equal(
      crewFileSchema.safeParse({ crew: [{ ...member, history: [bad] }] }).success,
      false,
    );
  });
});
