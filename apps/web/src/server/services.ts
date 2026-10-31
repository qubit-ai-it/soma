import "server-only";

import path from "node:path";

import { createJsonCrewRepository } from "../features/crew/crew.repository.json.ts";
import type { CrewRepository } from "../features/crew/crew.repository.ts";
import type { CarePlanner } from "../features/plan/planner.port.ts";
import { createMockPlanner } from "../features/plan/planner.mock.ts";
import { createMockClassifier } from "../features/risk/classifier.mock.ts";
import type { RiskClassifier } from "../features/risk/classifier.port.ts";
import type { RadiationSource } from "../features/space-weather/radiation.port.ts";
import {
  createFixtureRadiation,
  createFixtureSpaceWeather,
} from "../features/space-weather/space-weather.fixture.ts";
import type { SpaceWeatherSource } from "../features/space-weather/space-weather.port.ts";
import { getConfig } from "./config.ts";
import { createJsonStore } from "./json-store.ts";

export type Services = {
  crew: CrewRepository;
  classifier: RiskClassifier;
  planner: CarePlanner;
  spaceWeather: SpaceWeatherSource;
  radiation: RadiationSource;
};

function notImplemented(port: string, provider: string): never {
  throw new Error(
    `${port} provider "${provider}" has no adapter yet. Use "mock"/"fixture" or SOMA_OFFLINE=true.`,
  );
}

function build(): Services {
  const config = getConfig();
  const dataDir = path.join(process.cwd(), "data");
  const store = createJsonStore({
    seedDir: path.join(dataDir, "seed"),
    runtimeDir: path.join(dataDir, "runtime"),
  });

  return {
    crew: createJsonCrewRepository(store),
    classifier:
      config.classifier.provider === "mock"
        ? createMockClassifier()
        : notImplemented("classifier", config.classifier.provider),
    planner:
      config.planner.provider === "mock"
        ? createMockPlanner()
        : notImplemented("planner", config.planner.provider),
    spaceWeather:
      config.spaceWeather.provider === "fixture"
        ? createFixtureSpaceWeather()
        : notImplemented("spaceWeather", config.spaceWeather.provider),
    radiation:
      config.radiation.provider === "fixture"
        ? createFixtureRadiation()
        : notImplemented("radiation", config.radiation.provider),
  };
}

let cached: Services | undefined;

export function getServices(): Services {
  return (cached ??= build());
}
