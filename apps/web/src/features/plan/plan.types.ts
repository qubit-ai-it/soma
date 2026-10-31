export type CarePlanDTO = {
  steps: string[];
  uncertainty: string;
  requiresHumanValidation: true;
  provider: string;
  mode: "live" | "cache" | "mock";
};

export type PlanActionState =
  | { status: "idle" }
  | { status: "ready"; plan: CarePlanDTO }
  | { status: "error"; message: string };

export const IDLE_PLAN_STATE: PlanActionState = { status: "idle" };
