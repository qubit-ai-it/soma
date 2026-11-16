import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { radiationCard, spaceWeatherCards } from "./space-weather.display.ts";
import type { SpaceWeatherSnapshot } from "./space-weather.port.ts";

const live = { provider: "x", mode: "live", fetchedAt: "2026-10-31T00:00:00Z" } as const;

function snapshot(overrides: Partial<SpaceWeatherSnapshot> = {}): SpaceWeatherSnapshot {
  return {
    events: [
      { id: "a", type: "FLR", startTime: "2026-10-30T14:12:00Z", summary: "x" },
      { id: "b", type: "FLR", startTime: "2026-10-30T15:00:00Z", summary: "x" },
      { id: "c", type: "GST", startTime: "2026-10-31T03:00:00Z", summary: "x" },
    ],
    protonFluxPfu10Mev: 3.4,
    kpIndex: 5,
    xrayClass: "M1.2",
    source: live,
    ...overrides,
  };
}

const byId = (cards: ReturnType<typeof spaceWeatherCards>, id: string) => cards.find((c) => c.id === id);

describe("spaceWeatherCards", () => {
  it("credits events to DONKI and the rest to NOAA SWPC", () => {
    const cards = spaceWeatherCards(snapshot());
    assert.equal(byId(cards, "solar-events")?.source, "DONKI by NASA");
    for (const id of ["xray", "geomagnetic", "protons"]) assert.equal(byId(cards, id)?.source, "NOAA SWPC");
  });

  it("counts events and lists each kind once", () => {
    const solar = byId(spaceWeatherCards(snapshot()), "solar-events");
    assert.equal(solar?.value, "3 eventos");
    assert.equal(solar?.line, "Llamarada, Tormenta geomagnética");
    assert.equal(solar?.tone, "warn");
  });

  it("handles no events and a single event", () => {
    assert.equal(byId(spaceWeatherCards(snapshot({ events: [] })), "solar-events")?.value, "0 eventos");
    assert.equal(byId(spaceWeatherCards(snapshot({ events: [] })), "solar-events")?.tone, "ok");
    const one = snapshot().events?.slice(0, 1) ?? [];
    assert.equal(byId(spaceWeatherCards(snapshot({ events: one })), "solar-events")?.value, "1 evento");
  });

  it("leaves out a card whose source could not be read instead of showing zero", () => {
    const cards = spaceWeatherCards(snapshot({ events: null, kpIndex: null, protonFluxPfu10Mev: null, xrayClass: null }));
    assert.deepEqual(cards, []);
    const partial = spaceWeatherCards(snapshot({ events: null }));
    assert.equal(byId(partial, "solar-events"), undefined);
    assert.ok(byId(partial, "geomagnetic"));
  });

  it("raises the tone with a proton storm, high Kp, high proton flux or a strong flare", () => {
    const sep = [{ id: "s", type: "SEP", startTime: "2026-10-30T14:12:00Z", summary: "x" }] as const;
    assert.equal(byId(spaceWeatherCards(snapshot({ events: [...sep] })), "solar-events")?.tone, "danger");
    assert.equal(byId(spaceWeatherCards(snapshot({ kpIndex: 8 })), "geomagnetic")?.tone, "danger");
    assert.equal(byId(spaceWeatherCards(snapshot({ kpIndex: 2 })), "geomagnetic")?.tone, "ok");
    assert.equal(byId(spaceWeatherCards(snapshot({ protonFluxPfu10Mev: 12 })), "protons")?.tone, "warn");
    assert.equal(byId(spaceWeatherCards(snapshot({ xrayClass: "X2.0" })), "xray")?.tone, "danger");
    assert.equal(byId(spaceWeatherCards(snapshot({ xrayClass: "B5.2" })), "xray")?.tone, "ok");
  });

  it("says when the figures are a demo or a cached reading", () => {
    const mock = spaceWeatherCards(snapshot({ source: { ...live, mode: "mock" } }));
    assert.equal(byId(mock, "geomagnetic")?.source, "NOAA SWPC · Demo");
    const cache = spaceWeatherCards(snapshot({ source: { ...live, mode: "cache" } }));
    assert.equal(byId(cache, "solar-events")?.source, "DONKI by NASA · Última lectura");
  });
});

describe("radiationCard", () => {
  const window = {
    source: { provider: "RadLab", mode: "live", fetchedAt: "2026-11-16T00:00:00Z" },
    instrument: "BPD",
    samples: [
      { timestamp: "2025-11-13T19:00:00Z", doseRate: 30 },
      { timestamp: "2025-11-13T18:00:00Z", doseRate: 10 },
      { timestamp: "2025-11-11T10:00:00Z", doseRate: 1000 },
    ],
  } as const;

  it("averages the last 24 h of readings and dates them, since RadLab lags", () => {
    const card = radiationCard({ ...window, samples: [...window.samples] });
    assert.equal(card?.value, "20 µGy/h");
    assert.match(card?.line ?? "", /^BPD, promedio 24 h al 13 nov/);
    assert.equal(card?.source, "RadLab by NASA");
  });

  it("returns nothing when there are no samples", () => {
    assert.equal(radiationCard({ ...window, samples: [] }), null);
  });
});
