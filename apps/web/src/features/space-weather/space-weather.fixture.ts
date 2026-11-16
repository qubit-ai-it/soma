import "server-only";

import { z } from "zod";

import { readFixture } from "../../server/fixtures.ts";
import { ok } from "../../shared/result.ts";
import { mockSource } from "../../shared/source.ts";
import type { RadiationSource } from "./radiation.port.ts";
import type { SpaceWeatherSource } from "./space-weather.port.ts";

const spaceWeatherSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["FLR", "SEP", "CME", "GST"]),
      startTime: z.iso.datetime(),
      summary: z.string(),
    }),
  ),
  protonFluxPfu10Mev: z.number().min(0),
  kpIndex: z.number().min(0).max(9),
});

const radiationSchema = z.object({
  samples: z.array(
    z.object({ timestamp: z.iso.datetime(), doseRate: z.number().min(0) }),
  ),
});

export function createFixtureSpaceWeather(): SpaceWeatherSource {
  return {
    async getSnapshot() {
      const data = await readFixture("space-weather", spaceWeatherSchema);
      return ok({ ...data, xrayClass: null, source: mockSource("fixture") });
    },
  };
}

export function createFixtureRadiation(): RadiationSource {
  return {
    async getWindow() {
      const data = await readFixture("radiation", radiationSchema);
      return ok({ ...data, instrument: null, source: mockSource("fixture") });
    },
  };
}
