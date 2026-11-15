import type { SelectionInput } from "../protocols/protocols.types.ts";

type Attention = "nominal" | "watch" | "review";

const FLAG_RULES: Record<string, { ruleId: string; signal: string }> = {
  "short-sleep": { ruleId: "sleep-low", signal: "sleepHours" },
  "high-heart-rate": { ruleId: "heart-rate-high", signal: "heartRate" },
};

const STATUS_BY_ATTENTION = { nominal: "F0", watch: "F1", review: "F2" } as const;

// Bridge until the plan is fed by the rule engine Evaluation
export function selectionInputFromFlags(
  flagCodes: readonly string[],
  attention: Attention,
): SelectionInput {
  const mapped = flagCodes.flatMap((code) => FLAG_RULES[code] ?? []);
  return {
    status: STATUS_BY_ATTENTION[attention],
    triggeredRules: mapped.map((m) => m.ruleId),
    evidence: mapped.map((m) => ({ kind: "signal" as const, signal: m.signal })),
  };
}
