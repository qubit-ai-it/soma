import { baselineDelta, computeBaseline } from "../baseline/baseline.logic.ts";
import type { Baseline } from "../baseline/baseline.types.ts";
import {
  isEvaluable,
  isNumericObservation,
  type NumericObservation,
} from "../observation/observation.logic.ts";
import type {
  ConvergenceEvidence,
  EvaluateInput,
  Evaluation,
  Level,
  SignalEvidence,
  SignalRule,
  Status,
} from "./rules.types.ts";

export const ENGINE_VERSION = "0.1.0";

const EPSILON = 1e-9;
const RANK: Record<Level, number> = { F0: 0, F1: 1, F2: 2, F3: 3 };

type ReadyBaseline = Extract<Baseline, { status: "ready" }>;
type SignalContext = { baseline: ReadyBaseline; recent: NumericObservation[] };

function meets(rule: SignalRule, normalizedDelta: number): boolean {
  return rule.direction === "increase"
    ? normalizedDelta >= rule.minNormalizedDelta - EPSILON
    : normalizedDelta <= -rule.minNormalizedDelta + EPSILON;
}

function byTimeThenId(a: NumericObservation, b: NumericObservation): number {
  return Date.parse(a.observedAt) - Date.parse(b.observedAt) || a.id.localeCompare(b.id);
}

export function evaluate(input: EvaluateInput): Evaluation {
  const { subjectId, observations, ruleSet, baselineUntil, evaluatedAt } = input;
  const windowStart = Date.parse(baselineUntil);
  const windowEnd = Date.parse(evaluatedAt);
  const signals = [...new Set(ruleSet.rules.map((r) => r.signal))].sort();

  const limitations: string[] = [];
  const usable = new Map<string, SignalContext>();

  for (const signal of signals) {
    const baseline = computeBaseline(observations, {
      subjectId,
      signal,
      minObservations: input.minBaselineObservations,
      frozenAt: baselineUntil,
    });
    const recent = observations
      .filter((o) => o.subjectId === subjectId && o.signal === signal)
      .filter(isEvaluable)
      .filter(isNumericObservation)
      .filter((o) => {
        const at = Date.parse(o.observedAt);
        return at >= windowStart && at <= windowEnd;
      })
      .sort(byTimeThenId);

    if (baseline.status !== "ready") {
      limitations.push(`insufficient-baseline:${signal}:${baseline.reason}`);
    } else if (baseline.variability === 0) {
      limitations.push(`zero-variability:${signal}`);
    } else if (recent.length === 0) {
      limitations.push(`no-recent-observations:${signal}`);
    } else {
      usable.set(signal, { baseline, recent });
    }
  }

  const signalEvidence: SignalEvidence[] = [];
  for (const rule of ruleSet.rules) {
    const context = usable.get(rule.signal);
    if (context === undefined || context.recent.length < rule.minConsecutive) continue;

    const window = context.recent.slice(-rule.minConsecutive);
    const deltas: number[] = [];
    let satisfied = true;
    for (const observation of window) {
      const result = baselineDelta(context.baseline, observation);
      const normalized = result.ok ? result.value.normalizedDelta : null;
      if (normalized === null || !meets(rule, normalized)) {
        satisfied = false;
        break;
      }
      deltas.push(normalized);
    }
    if (!satisfied) continue;

    signalEvidence.push({
      kind: "signal",
      ruleId: rule.id,
      level: rule.level,
      signal: rule.signal,
      observationIds: window.map((o) => o.id),
      normalizedDeltas: deltas,
      baseline: {
        center: context.baseline.center,
        variability: context.baseline.variability,
        sampleCount: context.baseline.sampleCount,
        frozenAt: context.baseline.frozenAt ?? baselineUntil,
      },
    });
  }

  const firedSignals = [...new Set(signalEvidence.map((e) => e.signal))].sort();
  const convergenceEvidence: ConvergenceEvidence[] = ruleSet.convergence
    .filter((rule) => firedSignals.length >= rule.minSignals)
    .map((rule) => ({
      kind: "convergence",
      ruleId: rule.id,
      level: rule.level,
      signals: firedSignals,
    }));

  const evidence = [...signalEvidence, ...convergenceEvidence];

  let status: Status;
  if (evidence.length > 0) {
    status = evidence.reduce<Level>((top, e) => (RANK[e.level] > RANK[top] ? e.level : top), "F0");
  } else if (limitations.length > 0) {
    status = "NOT_EVALUABLE";
  } else {
    status = "F0";
  }

  return {
    status,
    subjectId,
    evaluatedAt,
    ruleSetVersion: ruleSet.version,
    engineVersion: ENGINE_VERSION,
    triggeredRules: evidence.map((e) => e.ruleId),
    evidence,
    limitations,
  };
}
