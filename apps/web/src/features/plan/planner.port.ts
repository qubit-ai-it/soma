import type { Result } from "../../shared/result.ts";
import type { SourceInfo } from "../../shared/source.ts";

export type PlanInput = {
  riskLevel: "low" | "moderate" | "high";
  concerns: string[];
};

export type CarePlanDraft = {
  steps: string[];
  /** What the model is unsure about. Always shown next to the plan. */
  uncertainty: string;
  /** Literal `true`: a plan can never be typed as already validated. */
  requiresHumanValidation: true;
  source: SourceInfo;
};

export interface CarePlanner {
  draft(input: PlanInput): Promise<Result<CarePlanDraft>>;
}
