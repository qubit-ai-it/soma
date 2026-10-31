import type { Result } from "../../shared/result.ts";
import type { SourceInfo } from "../../shared/source.ts";

export type RadiationSample = {
  timestamp: string;
  /** Unit is assumed to be µGy/h; RadLab does not state it explicitly. */
  doseRate: number;
};

export type RadiationWindow = {
  samples: RadiationSample[];
  source: SourceInfo;
};

export interface RadiationSource {
  getWindow(): Promise<Result<RadiationWindow>>;
}
