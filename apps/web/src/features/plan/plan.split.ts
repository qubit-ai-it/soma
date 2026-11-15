import type { ProtocolSelection } from "../protocols/protocols.types.ts";
import type { CarePlanDTO, ImmediateStep, SplitPlan } from "./plan.types.ts";

type DraftInput = Pick<CarePlanDTO, "steps" | "uncertainty" | "provider" | "mode">;

export function pendingDraft(input: DraftInput): CarePlanDTO {
  return {
    steps: input.steps,
    uncertainty: input.uncertainty,
    provider: input.provider,
    mode: input.mode,
    requiresHumanValidation: true,
    validation: { status: "pending-validation" },
  };
}

export function buildSplitPlan(
  selections: readonly ProtocolSelection[],
  proposedDraft: CarePlanDTO | null,
): SplitPlan {
  const immediateSteps: ImmediateStep[] = selections.flatMap(({ protocol, matchedBy }) =>
    protocol.steps.map((step) => ({
      stepId: step.id,
      text: step.text,
      protocolId: protocol.id,
      protocolTitle: protocol.title,
      approval: protocol.approval,
      matchedBy,
    })),
  );
  return { immediateSteps, proposedDraft };
}
