import type { Result } from "../../shared/result.ts";
import type { SourceInfo } from "../../shared/source.ts";

export type PlanInput = {
  riskLevel: "low" | "moderate" | "high";
  concerns: string[];
};

export type CarePlanDraft = {
  steps: string[];
  uncertainty: string;
  // literal true: a plan is never typed as validated
  requiresHumanValidation: true;
  source: SourceInfo;
};

export interface CarePlanner {
  draft(input: PlanInput): Promise<Result<CarePlanDraft>>;
}
