import "server-only";

import path from "node:path";

import { createJsonCrewRepository } from "../features/crew/crew.repository.json.ts";
import type { CrewRepository } from "../features/crew/crew.repository.ts";
import { createOllamaPlanner } from "../features/plan/ollama.client.ts";
import { createFallbackPlanner } from "../features/plan/planner.chain.ts";
import { createFixturePlanner } from "../features/plan/planner.fixture.ts";
import { createMockPlanner } from "../features/plan/planner.mock.ts";
import type { CarePlanner } from "../features/plan/planner.port.ts";
import { createFallbackClassifier } from "../features/risk/classifier.chain.ts";
import { createMockClassifier } from "../features/risk/classifier.mock.ts";
import type { RiskClassifier } from "../features/risk/classifier.port.ts";
import { createSystemOneClassifier } from "../features/risk/system-one.classifier.ts";
import type { RadiationSource } from "../features/space-weather/radiation.port.ts";
import {
  createFixtureRadiation,
  createFixtureSpaceWeather,
} from "../features/space-weather/space-weather.fixture.ts";
import type { SpaceWeatherSource } from "../features/space-weather/space-weather.port.ts";
import { getConfig, type Config } from "./config.ts";
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

function buildClassifier(config: Config): RiskClassifier {
  const { provider, jev, laya } = config.classifier;
  const mock = createMockClassifier();
  if (provider === "mock") return mock;

  const layaClassifier = createSystemOneClassifier({
    provider: "laya",
    baseUrl: laya.baseUrl,
    apiKey: laya.apiKey,
    models: { risk: laya.model },
    thresholds: { lowConfidenceBelow: laya.lowConfidenceBelow },
    calibrated: false,
    maxChoices: 100,
  });
  if (provider === "laya") return createFallbackClassifier([layaClassifier, mock]);

  if (!jev.apiKey) {
    console.warn("CLASSIFIER_PROVIDER=jev without TYPESAFE_API_KEY: using the simulated classifier.");
    return mock;
  }
  const jevClassifier = createSystemOneClassifier({
    provider: "jev",
    baseUrl: jev.baseUrl,
    apiKey: jev.apiKey,
    models: { risk: jev.model },
    thresholds: { lowConfidenceBelow: jev.lowConfidenceBelow },
    calibrated: true,
    maxChoices: 255,
  });
  return createFallbackClassifier([jevClassifier, layaClassifier, mock]);
}

function buildPlanner(config: Config): CarePlanner {
  const { provider, ollama } = config.planner;
  if (provider === "mock") return createMockPlanner();
  return createFallbackPlanner([
    createOllamaPlanner({ baseUrl: ollama.baseUrl, model: ollama.model }),
    createFixturePlanner(),
  ]);
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
    classifier: buildClassifier(config),
    planner: buildPlanner(config),
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
