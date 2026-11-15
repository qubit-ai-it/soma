import type { z } from "zod";

import type { Observation } from "../observation/observation.types.ts";
import type {
  followUpContractSchema,
  followUpTargetSchema,
  reviewWindowSchema,
} from "./followup.schema.ts";

export type FollowUpContract = z.infer<typeof followUpContractSchema>;
export type FollowUpTarget = z.infer<typeof followUpTargetSchema>;
export type ReviewWindow = z.infer<typeof reviewWindowSchema>;

export type FollowUpStatus = "improving" | "stable" | "worsening" | "not-evaluable";

export type NotEvaluableReason =
  | "baseline-insufficient"
  | "no-reference-deviation"
  | "data-quality"
  | "adherence-missing"
  | "adherence-low"
  | "adherence-changed";

export type SignalWindowResult = {
  signal: string;
  status: FollowUpStatus;
  observationCount: number;
  // fraction of the starting deviation recovered; negative means further away from baseline
  recoveredFraction: number | null;
  reason?: NotEvaluableReason;
};

export type WindowAdherence = {
  stepsDone: number;
  stepsPlanned: number;
  xrSessionsDone: number;
  xrSessionsPlanned: number;
  stepsRatio: number;
};

export type WindowResult = {
  windowId: string;
  label: string;
  start: string;
  end: string;
  status: FollowUpStatus;
  reasons: NotEvaluableReason[];
  signals: SignalWindowResult[];
  adherence: WindowAdherence | null;
};

export type FrozenBaselineInfo = {
  signal: string;
  center: number;
  variability: number;
  sampleCount: number;
  frozenAt: string;
};

export type FollowUpResult = {
  windows: WindowResult[];
  baselines: FrozenBaselineInfo[];
  consecutiveImproving: number;
  // improvement only proposes a step down: the app never applies it
  stepDown: {
    proposed: boolean;
    automatic: false;
    requiresHumanConfirmation: true;
  };
  escalate: { notifyEarth: boolean; reason: "latest-window-worsening" | null };
};

export type EvaluateFollowUpInput = {
  contract: FollowUpContract;
  observations: Observation[];
  evaluatedAt: string;
};
