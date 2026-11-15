import "server-only";

import { getServices } from "../../server/services.ts";
import { err, ok, type Result } from "../../shared/result.ts";
import { getProtocolLibrary } from "../protocols/protocols.queries.ts";
import { selectProtocols } from "../protocols/protocols.select.ts";
import type { PlanInput } from "./planner.port.ts";
import { buildSplitPlan, pendingDraft } from "./plan.split.ts";
import type { SelectionInput } from "../protocols/protocols.types.ts";
import type { CarePlanDTO, SplitPlan } from "./plan.types.ts";

export async function getPlanDraft(input: PlanInput): Promise<Result<CarePlanDTO>> {
  const result = await getServices().planner.draft(input);
  if (!result.ok) return err(result.error);
  const draft = result.value;
  return ok(
    pendingDraft({
      steps: draft.steps,
      uncertainty: draft.uncertainty,
      provider: draft.source.provider,
      mode: draft.source.mode,
    }),
  );
}

export async function getImmediatePlan(selection: SelectionInput): Promise<SplitPlan> {
  const library = await getProtocolLibrary();
  return buildSplitPlan(selectProtocols(selection, library.protocols), null);
}
