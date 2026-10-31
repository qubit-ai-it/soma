import type { Result } from "../../shared/result.ts";
import type { SourceInfo } from "../../shared/source.ts";

export type SpaceWeatherEvent = {
  id: string;
  type: "FLR" | "SEP" | "CME" | "GST";
  startTime: string;
  summary: string;
};

export type SpaceWeatherSnapshot = {
  events: SpaceWeatherEvent[];
  protonFluxPfu10Mev: number;
  kpIndex: number;
  source: SourceInfo;
};

export interface SpaceWeatherSource {
  getSnapshot(): Promise<Result<SpaceWeatherSnapshot>>;
}
