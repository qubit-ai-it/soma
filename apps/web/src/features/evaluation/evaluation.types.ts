import type { Level, Status } from "../rules/rules.types.ts";
import type { ProvenanceType, QualityState } from "../observation/observation.types.ts";

export type SeriesPoint = {
  index: number;
  observedAt: string;
  value: number | null;
  quality: QualityState;
};

export type SignalBaselineView =
  | {
      status: "ready";
      center: number;
      variability: number;
      sampleCount: number;
      band: { low: number; high: number };
    }
  | { status: "insufficient"; sampleCount: number; minObservations: number };

export type SignalDeviation = {
  delta: number;
  normalizedDelta: number | null;
};

export type SignalView = {
  signal: string;
  label: string;
  unit: string;
  provenance: { type: ProvenanceType; source: string; device?: string };
  baseline: SignalBaselineView;
  latest: { value: number; observedAt: string } | null;
  deviation: SignalDeviation | null;
  firedRuleIds: string[];
  points: SeriesPoint[];
  totalPoints: number;
  baselineEndIndex: number;
  domain: { min: number; max: number };
};

export type TriggeredRuleView = {
  id: string;
  level: Level;
  kind: "signal" | "convergence";
  label: string;
  description: string;
  signals: string[];
};

export type LimitationView = {
  code: string;
  signal: string | null;
  text: string;
};

export type CheckpointView = {
  index: number;
  label: string;
  evaluatedAt: string;
  status: Status;
  rules: TriggeredRuleView[];
  limitations: LimitationView[];
  signals: SignalView[];
};

export type ScenarioView = {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  baselineUntil: string;
  ruleSetVersion: string;
  engineVersion: string;
  provenanceTypes: ProvenanceType[];
  checkpoints: CheckpointView[];
};

export type EvaluationBoard = {
  scenarios: ScenarioView[];
};
