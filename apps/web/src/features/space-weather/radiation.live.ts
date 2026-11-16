import { z } from "zod";

import { err, ok, type Result } from "../../shared/result.ts";
import { withCache } from "./cache.ts";
import { fetchJson, type FetchLike } from "./http.ts";
import type { RadiationSample, RadiationSource, RadiationWindow } from "./radiation.port.ts";

type Options = {
  radlabBaseUrl: string;
  fetchImpl?: FetchLike;
  now?: () => number;
  ttlMs?: number;
};

const DAY_MS = 86_400_000;
// RadLab lags behind real time, so older windows are tried until one has data
const STEP_DAYS = 30;
const MAX_STEPS = 20;
const KEEP_HOURS = 24;
const TTL_MS = 6 * 60 * 60_000;

const table = z.object({
  columns: z.array(z.string()),
  data: z.array(z.tuple([z.string(), z.string(), z.number().nullable()])),
});

const stamp = (ms: number) => new Date(ms).toISOString().slice(0, 19);

function latestDay(rows: readonly [string, string, number | null][]): RadiationWindow | null {
  const valid = rows.filter((row): row is [string, string, number] => row[2] !== null);
  if (valid.length === 0) return null;

  // The instrument with the most readings; mixing instruments would blur the average
  const counts = new Map<string, number>();
  for (const [, instrument] of valid) counts.set(instrument, (counts.get(instrument) ?? 0) + 1);
  const [instrument] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  const own = valid.filter(([, id]) => id === instrument).sort((a, b) => a[0].localeCompare(b[0]));
  const lastMs = Date.parse(`${own[own.length - 1][0]}Z`);
  const samples: RadiationSample[] = own
    .filter(([timestamp]) => lastMs - Date.parse(`${timestamp}Z`) <= KEEP_HOURS * 3_600_000)
    .map(([timestamp, , doseRate]) => ({ timestamp: `${timestamp}Z`, doseRate }));

  return { samples, instrument, source: { provider: "RadLab", mode: "live", fetchedAt: "" } };
}

export function createLiveRadiation({
  radlabBaseUrl,
  fetchImpl,
  now = Date.now,
  ttlMs = TTL_MS,
}: Options): RadiationSource {
  async function load(): Promise<Result<RadiationWindow>> {
    let failed = 0;
    for (let step = 0; step < MAX_STEPS; step += 1) {
      const end = now() - step * STEP_DAYS * DAY_MS;
      const start = end - STEP_DAYS * DAY_MS;
      // In RadLab's syntax a bare word selects a column and "a>b" filters rows
      const url = `${radlabBaseUrl}/?timestamp&instrument_id&absorbed_dose_rate&format=json&timestamp>${stamp(start)}&timestamp<${stamp(end)}`;
      const response = await fetchJson(url, { fetchImpl, timeoutMs: 20_000 });
      if (!response.ok) {
        failed += 1;
        if (failed >= 2) return err(`RadLab: ${response.error}`);
        continue;
      }
      const parsed = table.safeParse(response.value);
      if (!parsed.success) return err("RadLab: unexpected format");
      const window = latestDay(parsed.data.data);
      if (window) {
        return ok({ ...window, source: { ...window.source, fetchedAt: new Date(now()).toISOString() } });
      }
    }
    return err("RadLab has no recent data");
  }

  return { getWindow: withCache(ttlMs, load, now) };
}
