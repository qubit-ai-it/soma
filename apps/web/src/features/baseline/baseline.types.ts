export type BaselineOptions = {
  subjectId: string;
  signal: string;
  minObservations: number;
  frozenAt?: string;
};

export type BaselineInsufficientReason = "too-few-observations" | "mixed-units";

export type Baseline =
  | {
      status: "ready";
      method: "median-mad";
      subjectId: string;
      signal: string;
      unit: string;
      center: number;
      variability: number;
      sampleCount: number;
      windowStart: string;
      windowEnd: string;
      frozenAt?: string;
    }
  | {
      status: "insufficient";
      reason: BaselineInsufficientReason;
      subjectId: string;
      signal: string;
      sampleCount: number;
      minObservations: number;
    };

export type BaselineDelta = {
  delta: number;
  normalizedDelta: number | null;
};

export type BaselineDeltaError =
  | "baseline-insufficient"
  | "observation-not-evaluable"
  | "observation-mismatch";
