import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  regionSeverities,
  signalSeverity,
  zoneReadings,
  ZONE_REGION_IDS,
} from "./crew.body.ts";
import type { CrewMember } from "./crew.types.ts";

const nominal: CrewMember = {
  id: "cm-x",
  name: "Test Member",
  role: "Tester",
  vitals: { heartRateBpm: 70, spo2Pct: 98, sleepHours: 7 },
  cumulativeDoseMsv: 20,
  lastCheckIn: "2026-10-31T06:00:00Z",
};

describe("signalSeverity", () => {
  it("classifies SpO2 as ok, possible risk, risky", () => {
    assert.equal(signalSeverity("spo2", 94), "ok");
    assert.equal(signalSeverity("spo2", 93), "possible-risk");
    assert.equal(signalSeverity("spo2", 90), "possible-risk");
    assert.equal(signalSeverity("spo2", 89), "risky");
  });

  it("classifies heart rate", () => {
    assert.equal(signalSeverity("heartRate", 100), "ok");
    assert.equal(signalSeverity("heartRate", 101), "possible-risk");
    assert.equal(signalSeverity("heartRate", 120), "possible-risk");
    assert.equal(signalSeverity("heartRate", 121), "risky");
  });

  it("classifies sleep", () => {
    assert.equal(signalSeverity("sleep", 6), "ok");
    assert.equal(signalSeverity("sleep", 5.9), "possible-risk");
    assert.equal(signalSeverity("sleep", 4), "possible-risk");
    assert.equal(signalSeverity("sleep", 3.9), "risky");
  });

  it("classifies cumulative dose", () => {
    assert.equal(signalSeverity("dose", 100), "ok");
    assert.equal(signalSeverity("dose", 100.1), "possible-risk");
    assert.equal(signalSeverity("dose", 150), "possible-risk");
    assert.equal(signalSeverity("dose", 150.1), "risky");
  });
});

describe("zoneReadings", () => {
  it("paints every zone ok for nominal vitals", () => {
    assert.deepEqual(
      zoneReadings(nominal).map((zone) => [zone.zone, zone.severity]),
      [
        ["head", "ok"],
        ["thorax", "ok"],
        ["abdomen-pelvis", "ok"],
      ],
    );
  });

  it("maps SpO2 and heart rate to thorax, sleep to head, dose to abdomen and pelvis", () => {
    const member: CrewMember = {
      ...nominal,
      vitals: { heartRateBpm: 70, spo2Pct: 92, sleepHours: 5 },
      cumulativeDoseMsv: 120,
    };
    const byZone = Object.fromEntries(
      zoneReadings(member).map((zone) => [zone.zone, zone]),
    );
    assert.equal(byZone["head"].severity, "possible-risk");
    assert.deepEqual(byZone["head"].causes.map((c) => c.signal), ["sleep"]);
    assert.equal(byZone["thorax"].severity, "possible-risk");
    assert.deepEqual(byZone["thorax"].causes.map((c) => c.signal), ["spo2"]);
    assert.equal(byZone["abdomen-pelvis"].severity, "possible-risk");
    assert.deepEqual(byZone["abdomen-pelvis"].causes.map((c) => c.signal), ["dose"]);
  });

  it("takes the worst severity among the signals that affect a zone", () => {
    const member: CrewMember = {
      ...nominal,
      vitals: { heartRateBpm: 105, spo2Pct: 88, sleepHours: 7 },
    };
    const thorax = zoneReadings(member).find((zone) => zone.zone === "thorax");
    assert.equal(thorax?.severity, "risky");
    assert.deepEqual(
      thorax?.causes.map((c) => [c.signal, c.severity]),
      [
        ["heartRate", "possible-risk"],
        ["spo2", "risky"],
      ],
    );
  });

  it("lists only the signals that are out of range as causes", () => {
    const thorax = zoneReadings(nominal).find((zone) => zone.zone === "thorax");
    assert.deepEqual(thorax?.causes, []);
  });
});

describe("regionSeverities", () => {
  it("expands each zone severity to its body map region ids", () => {
    const member: CrewMember = {
      ...nominal,
      vitals: { heartRateBpm: 70, spo2Pct: 85, sleepHours: 7 },
    };
    const regions = regionSeverities(zoneReadings(member));
    for (const id of ZONE_REGION_IDS["thorax"]) assert.equal(regions[id], "risky");
    for (const id of ZONE_REGION_IDS["head"]) assert.equal(regions[id], "ok");
  });
});
