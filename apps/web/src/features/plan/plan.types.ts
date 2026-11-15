import type { Protocol } from "../protocols/protocols.types.ts";

// The app can only ever construct "pending-validation": approval is a decision taken on Earth
export type DraftValidation = { status: "pending-validation" };

export type CarePlanDTO = {
  steps: string[];
  uncertainty: string;
  requiresHumanValidation: true;
  validation: DraftValidation;
  provider: string;
  mode: "live" | "cache" | "mock";
};

export type ImmediateStep = {
  stepId: string;
  text: string;
  protocolId: string;
  protocolTitle: string;
  approval: Protocol["approval"];
  matchedBy: string[];
};

export type SplitPlan = {
  immediateSteps: ImmediateStep[];
  proposedDraft: CarePlanDTO | null;
};

export type PlanActionState =
  | { status: "idle" }
  | { status: "ready"; plan: CarePlanDTO }
  | { status: "error"; message: string };

export const IDLE_PLAN_STATE: PlanActionState = { status: "idle" };
