import "server-only";

import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform((value) => value || undefined);

const envSchema = z.object({
  SOMA_OFFLINE: z.stringbool().default(false),

  CLASSIFIER_PROVIDER: z.enum(["jev", "laya", "mock"]).default("mock"),
  TYPESAFE_API_KEY: optionalString,
  JEV_BASE_URL: z.url().default("https://api.typesafe.ai"),
  JEV_MODEL: z.string().default("jev-latest"),
  JEV_LOW_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.6),
  LAYA_BASE_URL: z.url().default("http://localhost:8000"),
  LAYA_MODEL: z.string().default("typed-decisions"),
  LAYA_API_KEY: optionalString,
  LAYA_LOW_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.4),

  PLANNER_PROVIDER: z.enum(["ollama", "mock"]).default("mock"),
  OLLAMA_BASE_URL: z.url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("medgemma1.5:4b"),

  GEMINI_API_KEY: optionalString,
  GEMINI_BASE_URL: z.url().default("https://generativelanguage.googleapis.com/v1beta"),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),

  SPACE_WEATHER_PROVIDER: z.enum(["live", "fixture"]).default("fixture"),
  DONKI_BASE_URL: z.url().default("https://ccmc.gsfc.nasa.gov/DONKI/WS/get"),
  SWPC_BASE_URL: z.url().default("https://services.swpc.noaa.gov"),

  RADIATION_PROVIDER: z.enum(["fixture", "live"]).default("fixture"),
  RADLAB_BASE_URL: z
    .url()
    .default("https://visualization.osdr.nasa.gov/radlab/api"),
});

export type Config = ReturnType<typeof buildConfig>;

function buildConfig(env: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
  }
  const e = parsed.data;
  const offline = e.SOMA_OFFLINE;
  return {
    offline,
    classifier: {
      provider: offline ? ("mock" as const) : e.CLASSIFIER_PROVIDER,
      jev: {
        baseUrl: e.JEV_BASE_URL,
        apiKey: e.TYPESAFE_API_KEY,
        model: e.JEV_MODEL,
        lowConfidenceBelow: e.JEV_LOW_CONFIDENCE,
      },
      laya: {
        baseUrl: e.LAYA_BASE_URL,
        apiKey: e.LAYA_API_KEY,
        model: e.LAYA_MODEL,
        lowConfidenceBelow: e.LAYA_LOW_CONFIDENCE,
      },
    },
    planner: {
      provider: offline ? ("mock" as const) : e.PLANNER_PROVIDER,
      ollama: { baseUrl: e.OLLAMA_BASE_URL, model: e.OLLAMA_MODEL },
    },
    chat: {
      apiKey: e.GEMINI_API_KEY,
      baseUrl: e.GEMINI_BASE_URL,
      model: e.GEMINI_MODEL,
    },
    spaceWeather: {
      provider: offline ? ("fixture" as const) : e.SPACE_WEATHER_PROVIDER,
      donkiBaseUrl: e.DONKI_BASE_URL,
      swpcBaseUrl: e.SWPC_BASE_URL,
    },
    radiation: {
      provider: offline ? ("fixture" as const) : e.RADIATION_PROVIDER,
      radlabBaseUrl: e.RADLAB_BASE_URL,
    },
  };
}

let cached: Config | undefined;

export function getConfig(): Config {
  return (cached ??= buildConfig(process.env));
}
