import type { CheckpointView } from "../evaluation/evaluation.types.ts";
import type { SelectionInput } from "../protocols/protocols.types.ts";

export function selectionInputFromCheckpoint(checkpoint: CheckpointView): SelectionInput {
  return {
    status: checkpoint.status,
    triggeredRules: checkpoint.rules.map((rule) => rule.id),
    evidence: checkpoint.rules.map((rule) =>
      rule.kind === "convergence"
        ? { kind: "convergence" as const, signals: rule.signals }
        : { kind: "signal" as const, signal: rule.signals[0] },
    ),
  };
}
