import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Alert } from "../alerts/alerts.types.ts";
import { isVisibleTo } from "../notifications/notifications.logic.ts";
import type { SpaceWeatherSnapshot } from "../space-weather/space-weather.port.ts";
import {
  checkinNotification,
  geomagneticScale,
  latestShiftBoundary,
  linkNotification,
  protonScale,
  shiftNotifications,
  spaceWeatherNotifications,
} from "./sentry.talk.ts";

const at = (iso: string) => Date.parse(iso);

describe("check-in", () => {
  it("is for the person only, once per UTC day, after the morning hour", () => {
    assert.equal(checkinNotification("cm-02", at("2026-11-16T05:59:00Z")), null);
    const n = checkinNotification("cm-02", at("2026-11-16T09:00:00Z"));
    assert.equal(n?.dedupeKey, "checkin:sleep:cm-02:2026-11-16");
    assert.equal(n?.title, "How did you sleep?");
    assert.ok(isVisibleTo(n!.audience, { role: "astronaut", memberId: "cm-02" }));
    assert.ok(!isVisibleTo(n!.audience, { role: "cmo" }));
    assert.equal(checkinNotification("cm-02", at("2026-11-16T20:00:00Z"))?.dedupeKey, n?.dedupeKey);
  });
});

describe("shift boundaries and summaries", () => {
  it("finds the latest 06:00 or 18:00 UTC boundary", () => {
    assert.equal(latestShiftBoundary(at("2026-11-16T07:30:00Z")), at("2026-11-16T06:00:00Z"));
    assert.equal(latestShiftBoundary(at("2026-11-16T18:00:00Z")), at("2026-11-16T18:00:00Z"));
    assert.equal(latestShiftBoundary(at("2026-11-16T03:00:00Z")), at("2026-11-15T18:00:00Z"));
  });

  const members = [
    { id: "cm-01", label: "Crew member cm-01" },
    { id: "cm-02", label: "Crew member cm-02" },
  ];
  const alert = (id: string, memberId: string, level: Alert["level"], createdAt: string): Alert => ({
    id,
    memberId,
    memberLabel: memberId,
    level,
    title: "t",
    action: "a",
    recipients: ["cmo"],
    status: "open",
    createdAt,
    source: "x",
  });

  it("counts only the previous shift and reports current levels", () => {
    const boundary = at("2026-11-16T18:00:00Z");
    const list = shiftNotifications(
      boundary,
      members,
      [
        alert("1", "cm-02", "F2", "2026-11-16T10:00:00Z"),
        alert("2", "cm-02", "F3", "2026-11-16T12:00:00Z"),
        alert("3", "cm-01", "F2", "2026-11-16T05:00:00Z"),
        alert("4", "cm-01", "F2", "2026-11-16T18:30:00Z"),
      ],
      { "cm-01": "F0", "cm-02": "F2" },
    );
    const crew = list[0];
    assert.equal(crew.body, "Previous shift: 2 alerts (1 F3, 1 F2). Now: 1 F0, 1 F2.");
    assert.ok(isVisibleTo(crew.audience, { role: "commander" }) && !isVisibleTo(crew.audience, { role: "earth" }));
    const cm01 = list.find((n) => n.memberId === "cm-01")!;
    assert.equal(cm01.body, "Your previous shift: no alerts. Now: F0.");
    assert.equal(cm01.priority, "low");
    assert.equal(list.length, 3);
  });

  it("says not evaluated instead of inventing a level", () => {
    const [crew] = shiftNotifications(at("2026-11-16T06:00:00Z"), members, [], { "cm-01": null });
    assert.equal(crew.body, "Previous shift: no alerts. Now: 2 not evaluated.");
  });
});

describe("link notifications", () => {
  const down = { status: "disconnected" as const, updatedAt: "2026-11-16T10:00:00.000Z" };
  const up = { status: "connected" as const, updatedAt: "2026-11-16T10:05:00.000Z" };

  it("reports changes only", () => {
    assert.equal(linkNotification(up, { status: "connected" }), null);
    assert.equal(linkNotification(up, null), null);
    assert.equal(linkNotification(down, null)?.priority, "high");
    assert.equal(linkNotification(down, { status: "connected" })?.title, "Earth link lost");
    assert.equal(linkNotification(up, { status: "disconnected" })?.title, "Earth link restored");
  });

  it("goes to the CMO and the commander", () => {
    const n = linkNotification(down, { status: "connected" })!;
    assert.ok(isVisibleTo(n.audience, { role: "cmo" }) && isVisibleTo(n.audience, { role: "commander" }));
    assert.ok(!isVisibleTo(n.audience, { role: "astronaut", memberId: "cm-02" }));
  });
});

describe("space weather", () => {
  const snapshot = (over: Partial<SpaceWeatherSnapshot>): SpaceWeatherSnapshot => ({
    events: [],
    protonFluxPfu10Mev: 0.2,
    kpIndex: 2,
    xrayClass: null,
    source: { provider: "NOAA SWPC", mode: "live", fetchedAt: "2026-11-16T10:00:00.000Z" },
    ...over,
  });
  const now = at("2026-11-16T10:00:00Z");

  it("maps Kp and proton flux to NOAA scales", () => {
    assert.deepEqual([4, 4.4, 5, 6, 7, 8, 9].map(geomagneticScale), [0, 0, 1, 2, 3, 4, 5]);
    assert.deepEqual([9, 10, 99, 100, 1000, 10000, 100000].map(protonScale), [0, 1, 1, 2, 3, 4, 5]);
  });

  it("stays quiet in calm conditions and when a value is unknown", () => {
    assert.deepEqual(spaceWeatherNotifications(snapshot({}), now), []);
    assert.deepEqual(spaceWeatherNotifications(snapshot({ kpIndex: null, protonFluxPfu10Mev: null }), now), []);
  });

  it("never notifies from simulated sources", () => {
    const mock = snapshot({ kpIndex: 8, source: { provider: "fixture", mode: "mock", fetchedAt: "x" } });
    assert.deepEqual(spaceWeatherNotifications(mock, now), []);
  });

  it("notifies the crew with visible provenance and scaled priority", () => {
    const [storm, protons] = spaceWeatherNotifications(snapshot({ kpIndex: 7, protonFluxPfu10Mev: 12 }), now);
    assert.equal(storm.title, "Geomagnetic storm G3");
    assert.equal(storm.priority, "high");
    assert.equal(storm.body, "Kp 7 · NOAA SWPC · live");
    assert.equal(protons.priority, "low");
    assert.ok(isVisibleTo(storm.audience, { role: "astronaut", memberId: "cm-04" }));
    assert.ok(!isVisibleTo(storm.audience, { role: "earth" }));
  });

  it("marks cached data and uses a 6 h dedupe window", () => {
    const cached = snapshot({ kpIndex: 5, source: { provider: "NOAA SWPC", mode: "cache", fetchedAt: "x" } });
    const [a] = spaceWeatherNotifications(cached, now);
    const [b] = spaceWeatherNotifications(cached, now + 3_600_000);
    const [c] = spaceWeatherNotifications(cached, now + 7 * 3_600_000);
    assert.ok(a.body?.endsWith("cache"));
    assert.equal(a.dedupeKey, b.dedupeKey);
    assert.notEqual(a.dedupeKey, c.dedupeKey);
  });
});
