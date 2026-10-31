import "server-only";

import { getServices } from "../../server/services.ts";
import { err, ok, type Result } from "../../shared/result.ts";
import type { PlanInput } from "./planner.port.ts";
import type { CarePlanDTO } from "./plan.types.ts";

export async function getPlanDraft(input: PlanInput): Promise<Result<CarePlanDTO>> {
  const result = await getServices().planner.draft(input);
  if (!result.ok) return err(result.error);
  const draft = result.value;
  return ok({
    steps: draft.steps,
    uncertainty: draft.uncertainty,
    requiresHumanValidation: draft.requiresHumanValidation,
    provider: draft.source.provider,
    mode: draft.source.mode,
  });
}
