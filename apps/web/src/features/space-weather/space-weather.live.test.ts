import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createLiveRadiation } from "./radiation.live.ts";
import { createLiveSpaceWeather } from "./space-weather.live.ts";

const NOW = Date.parse("2026-11-15T12:00:00Z");

function json(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}

type Route = (url: string) => Response | undefined;

function fakeFetch(...routes: Route[]) {
  const calls: string[] = [];
  const impl = async (url: string) => {
    calls.push(url);
    for (const route of routes) {
      const response = route(url);
      if (response) return response;
    }
    return json("API Error: nope");
  };
  return { impl, calls };
}

const weatherRoutes: Route[] = [
  (url) => (url.includes("/FLR?") ? json([{ flrID: "f1", beginTime: "2026-11-14T10:00Z", classType: "M2.0", activeRegionNum: 14566 }]) : undefined),
  (url) => (url.includes("/CME?") ? json([{ activityID: "c1", startTime: "2026-11-15T01:00Z" }]) : undefined),
  (url) => (url.includes("/GST?") ? json([{ gstID: "g1", startTime: "2026-11-13T18:00Z", allKpIndex: [{ kpIndex: 5.33 }, { kpIndex: 6 }] }]) : undefined),
  (url) => (url.includes("/SEP?") ? json([]) : undefined),
  (url) => (url.endsWith("noaa-planetary-k-index.json") ? json([{ time_tag: "a", Kp: 1 }, { time_tag: "b", Kp: 2.33 }]) : undefined),
  (url) =>
    url.endsWith("integral-protons-6-hour.json")
      ? json([
          { time_tag: "2026-11-15T11:00:00Z", energy: ">=10 MeV", flux: 0.5 },
          { time_tag: "2026-11-15T11:05:00Z", energy: ">=10 MeV", flux: 0.7 },
          { time_tag: "2026-11-15T11:05:00Z", energy: ">=100 MeV", flux: 9 },
        ])
      : undefined,
  (url) => (url.endsWith("xray-flares-latest.json") ? json([{ current_class: "C1.5" }]) : undefined),
];

const base = { donkiBaseUrl: "https://donki.test/get", swpcBaseUrl: "https://swpc.test", now: () => NOW };

describe("createLiveSpaceWeather", () => {
  it("builds a snapshot from DONKI and NOAA SWPC", async () => {
    const { impl, calls } = fakeFetch(...weatherRoutes);
    const result = await createLiveSpaceWeather({ ...base, fetchImpl: impl }).getSnapshot();
    assert.ok(result.ok);
    assert.equal(result.value.kpIndex, 2.33);
    assert.equal(result.value.protonFluxPfu10Mev, 0.7);
    assert.equal(result.value.xrayClass, "C1.5");
    assert.deepEqual(
      result.value.events?.map((e) => e.type),
      ["CME", "FLR", "GST"],
    );
    assert.match(result.value.events?.find((e) => e.type === "GST")?.summary ?? "", /max Kp 6/);
    assert.equal(result.value.source.mode, "live");
    assert.ok(calls.some((url) => url.includes("startDate=2026-11-08&endDate=2026-11-15")));
  });

  it("treats DONKI failing as unknown events, not as zero", async () => {
    const { impl } = fakeFetch(...weatherRoutes.slice(4));
    const result = await createLiveSpaceWeather({ ...base, fetchImpl: impl }).getSnapshot();
    assert.ok(result.ok);
    assert.equal(result.value.events, null);
    assert.equal(result.value.kpIndex, 2.33);
  });

  it("fails when nothing could be read", async () => {
    const { impl } = fakeFetch();
    const result = await createLiveSpaceWeather({ ...base, fetchImpl: impl }).getSnapshot();
    assert.equal(result.ok, false);
  });

  it("serves the last good snapshot as cache when the source goes down", async () => {
    let up = true;
    let clock = NOW;
    const impl = async (url: string) => {
      if (!up) return json("down", 503);
      for (const route of weatherRoutes) {
        const response = route(url);
        if (response) return response;
      }
      return json("API Error");
    };
    const source = createLiveSpaceWeather({ ...base, now: () => clock, fetchImpl: impl, ttlMs: 1000 });
    assert.ok((await source.getSnapshot()).ok);
    up = false;
    clock += 5000;
    const stale = await source.getSnapshot();
    assert.ok(stale.ok);
    assert.equal(stale.value.source.mode, "cache");
    assert.equal(stale.value.kpIndex, 2.33);
  });
});

describe("createLiveRadiation", () => {
  const rows = [
    ["2025-11-13T18:00:00", "BPD", 10],
    ["2025-11-13T19:00:00", "BPD", 30],
    ["2025-11-13T19:30:00", "OTHER", 5],
  ];

  it("walks back in time until RadLab has data and keeps the latest day of the main instrument", async () => {
    const { impl, calls } = fakeFetch(() => {
      const empty = json({ columns: ["timestamp", "instrument_id", "absorbed_dose_rate"], data: [] });
      return calls.length < 4 ? empty : json({ columns: [], data: rows });
    });
    const result = await createLiveRadiation({
      radlabBaseUrl: "https://radlab.test/api",
      now: () => NOW,
      fetchImpl: impl,
    }).getWindow();
    assert.ok(result.ok);
    assert.equal(result.value.instrument, "BPD");
    assert.deepEqual(
      result.value.samples.map((s) => s.doseRate),
      [10, 30],
    );
    assert.ok(calls.length >= 4);
    assert.ok(calls[0].includes("absorbed_dose_rate"));
  });

  it("fails clearly when the service is down", async () => {
    const { impl } = fakeFetch(() => json("down", 503));
    const result = await createLiveRadiation({
      radlabBaseUrl: "https://radlab.test/api",
      now: () => NOW,
      fetchImpl: impl,
    }).getWindow();
    assert.equal(result.ok, false);
  });
});
