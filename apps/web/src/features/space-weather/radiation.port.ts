import type { Result } from "../../shared/result.ts";
import type { SourceInfo } from "../../shared/source.ts";

export type RadiationSample = {
  timestamp: string;
  // µGy/h, as defined by the RadLab knowledge base for absorbed dose rate
  doseRate: number;
};

export type RadiationWindow = {
  samples: RadiationSample[];
  instrument: string | null;
  source: SourceInfo;
};

export interface RadiationSource {
  getWindow(): Promise<Result<RadiationWindow>>;
}
