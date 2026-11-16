import { z } from "zod";

import { err, ok, type Result } from "../../shared/result.ts";
import { withCache } from "./cache.ts";
import { fetchJson, type FetchLike } from "./http.ts";
import type {
  SpaceWeatherEvent,
  SpaceWeatherSnapshot,
  SpaceWeatherSource,
} from "./space-weather.port.ts";

type Options = {
  donkiBaseUrl: string;
  swpcBaseUrl: string;
  fetchImpl?: FetchLike;
  now?: () => number;
  ttlMs?: number;
};

const DAY_MS = 86_400_000;
const EVENT_WINDOW_DAYS = 7;
const TTL_MS = 5 * 60_000;

const flares = z.array(
  z.object({
    flrID: z.string(),
    beginTime: z.string(),
    classType: z.string().nullish(),
    activeRegionNum: z.number().nullish(),
  }),
);
const cmes = z.array(z.object({ activityID: z.string(), startTime: z.string() }));
const storms = z.array(
  z.object({
    gstID: z.string(),
    startTime: z.string(),
    allKpIndex: z.array(z.object({ kpIndex: z.number() })).nullish(),
  }),
);
const protonEvents = z.array(z.object({ sepID: z.string(), eventTime: z.string() }));

const kpSeries = z.array(z.object({ time_tag: z.string(), Kp: z.number() }));
const protonSeries = z.array(z.object({ time_tag: z.string(), energy: z.string(), flux: z.number() }));
const xraySeries = z.array(z.object({ current_class: z.string().nullish() }));

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const iso = (value: string) => new Date(value).toISOString();

function parse<S extends z.ZodType>(schema: S, value: Result<unknown>): Result<z.output<S>> {
  if (!value.ok) return value;
  const parsed = schema.safeParse(value.value);
  return parsed.success ? ok(parsed.data) : err("Formato inesperado");
}

export function createLiveSpaceWeather({
  donkiBaseUrl,
  swpcBaseUrl,
  fetchImpl,
  now = Date.now,
  ttlMs = TTL_MS,
}: Options): SpaceWeatherSource {
  const get = (url: string) => fetchJson(url, { fetchImpl });
  const donkiRange = () => {
    const end = now();
    return `startDate=${day(end - EVENT_WINDOW_DAYS * DAY_MS)}&endDate=${day(end)}`;
  };
  const donki = (type: string) => get(`${donkiBaseUrl}/${type}?${donkiRange()}`);

  async function loadEvents(): Promise<SpaceWeatherEvent[] | null> {
    const [flr, cme, gst, sep] = await Promise.all([
      donki("FLR").then((r) => parse(flares, r)),
      donki("CME").then((r) => parse(cmes, r)),
      donki("GST").then((r) => parse(storms, r)),
      donki("SEP").then((r) => parse(protonEvents, r)),
    ]);
    // Every request failing means the events are unknown, not that there were none
    if (!flr.ok && !cme.ok && !gst.ok && !sep.ok) return null;

    const events: SpaceWeatherEvent[] = [];
    if (flr.ok) {
      for (const e of flr.value) {
        const detail = [e.classType, e.activeRegionNum ? `región ${e.activeRegionNum}` : null].filter(Boolean);
        events.push({ id: e.flrID, type: "FLR", startTime: iso(e.beginTime), summary: `Llamarada ${detail.join(", ")}`.trim() });
      }
    }
    if (cme.ok) {
      for (const e of cme.value) {
        events.push({ id: e.activityID, type: "CME", startTime: iso(e.startTime), summary: "Eyección de masa coronal" });
      }
    }
    if (gst.ok) {
      for (const e of gst.value) {
        const peak = Math.max(0, ...(e.allKpIndex ?? []).map((k) => k.kpIndex));
        events.push({ id: e.gstID, type: "GST", startTime: iso(e.startTime), summary: `Tormenta geomagnética, Kp máx. ${peak}` });
      }
    }
    if (sep.ok) {
      for (const e of sep.value) {
        events.push({ id: e.sepID, type: "SEP", startTime: iso(e.eventTime), summary: "Evento de partículas solares" });
      }
    }
    return events.sort((a, b) => b.startTime.localeCompare(a.startTime));
  }

  async function loadKp(): Promise<number | null> {
    const result = parse(kpSeries, await get(`${swpcBaseUrl}/products/noaa-planetary-k-index.json`));
    return result.ok ? (result.value.at(-1)?.Kp ?? null) : null;
  }

  async function loadProtons(): Promise<number | null> {
    const result = parse(
      protonSeries,
      await get(`${swpcBaseUrl}/json/goes/primary/integral-protons-6-hour.json`),
    );
    if (!result.ok) return null;
    const latest = result.value
      .filter((row) => row.energy === ">=10 MeV")
      .sort((a, b) => a.time_tag.localeCompare(b.time_tag))
      .at(-1);
    return latest?.flux ?? null;
  }

  async function loadXray(): Promise<string | null> {
    const result = parse(xraySeries, await get(`${swpcBaseUrl}/json/goes/primary/xray-flares-latest.json`));
    return result.ok ? (result.value[0]?.current_class ?? null) : null;
  }

  async function load(): Promise<Result<SpaceWeatherSnapshot>> {
    const [events, kpIndex, protonFluxPfu10Mev, xrayClass] = await Promise.all([
      loadEvents(),
      loadKp(),
      loadProtons(),
      loadXray(),
    ]);
    if (events === null && kpIndex === null && protonFluxPfu10Mev === null && xrayClass === null) {
      return err("No se pudo contactar a DONKI ni a NOAA SWPC");
    }
    return ok({
      events,
      kpIndex,
      protonFluxPfu10Mev,
      xrayClass,
      source: { provider: "DONKI + NOAA SWPC", mode: "live", fetchedAt: new Date(now()).toISOString() },
    });
  }

  return { getSnapshot: withCache(ttlMs, load, now) };
}
