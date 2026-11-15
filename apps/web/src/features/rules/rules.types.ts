import type { z } from "zod";

import type { Observation } from "../observation/observation.types.ts";
import type {
  convergenceRuleSchema,
  ruleSetSchema,
  signalRuleSchema,
} from "./rules.schema.ts";

export type SignalRule = z.infer<typeof signalRuleSchema>;
export type ConvergenceRule = z.infer<typeof convergenceRuleSchema>;
export type RuleSet = z.infer<typeof ruleSetSchema>;

export type Level = "F0" | "F1" | "F2" | "F3";
export type Status = Level | "NOT_EVALUABLE";

export type SignalEvidence = {
  kind: "signal";
  ruleId: string;
  level: "F1" | "F2" | "F3";
  signal: string;
  observationIds: string[];
  normalizedDeltas: number[];
  baseline: {
    center: number;
    variability: number;
    sampleCount: number;
    frozenAt: string;
  };
};

export type ConvergenceEvidence = {
  kind: "convergence";
  ruleId: string;
  level: "F2" | "F3";
  signals: string[];
};

export type Evidence = SignalEvidence | ConvergenceEvidence;

export type Evaluation = {
  status: Status;
  subjectId: string;
  evaluatedAt: string;
  ruleSetVersion: string;
  engineVersion: string;
  triggeredRules: string[];
  evidence: Evidence[];
  limitations: string[];
};

export type EvaluateInput = {
  subjectId: string;
  observations: Observation[];
  ruleSet: RuleSet;
  minBaselineObservations: number;
  baselineUntil: string;
  evaluatedAt: string;
};
