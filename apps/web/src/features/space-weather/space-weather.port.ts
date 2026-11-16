import type { Result } from "../../shared/result.ts";
import type { SourceInfo } from "../../shared/source.ts";

export type SpaceWeatherEvent = {
  id: string;
  type: "FLR" | "SEP" | "CME" | "GST";
  startTime: string;
  summary: string;
};

// null means the source could not be read, which is not the same as zero
export type SpaceWeatherSnapshot = {
  events: SpaceWeatherEvent[] | null;
  protonFluxPfu10Mev: number | null;
  kpIndex: number | null;
  xrayClass: string | null;
  source: SourceInfo;
};

export interface SpaceWeatherSource {
  getSnapshot(): Promise<Result<SpaceWeatherSnapshot>>;
}
