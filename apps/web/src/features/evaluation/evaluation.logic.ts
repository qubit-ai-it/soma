import { baselineDelta, computeBaseline } from "../baseline/baseline.logic.ts";
import {
  isEvaluable,
  isNumericObservation,
  type NumericObservation,
} from "../observation/observation.logic.ts";
import type { Observation, ProvenanceType } from "../observation/observation.types.ts";
import { ENGINE_VERSION, evaluate } from "../rules/rules.engine.ts";
import type {
  ConvergenceRule,
  Evaluation,
  RuleSet,
  SignalRule,
} from "../rules/rules.types.ts";
import { buildObservations } from "../scenario/scenario.build.ts";
import type { Scenario } from "../scenario/scenario.types.ts";
import {
  RULE_LABEL,
  SCENARIO_COPY,
  signalLabel,
  translateLimitation,
} from "./evaluation.labels.ts";
import type {
  CheckpointView,
  EvaluationBoard,
  ScenarioView,
  SignalBaselineView,
  SignalDeviation,
  SignalView,
  TriggeredRuleView,
} from "./evaluation.types.ts";

export const BAND_SIGMAS = 2;
const DOMAIN_PADDING = 0.08;

export type EvaluationOptions = { minBaselineObservations: number };

export function matchesSubject(scenario: { subjectId: string }, memberId: string): boolean {
  return scenario.subjectId === memberId;
}

function byTime(a: Observation, b: Observation): number {
  return Date.parse(a.observedAt) - Date.parse(b.observedAt);
}

function describeSignalRule(rule: SignalRule): string {
  const verb = rule.direction === "increase" ? "rises" : "drops";
  const reads = rule.minConsecutive === 1 ? "1 reading" : `${rule.minConsecutive} consecutive readings`;
  return `${signalLabel(rule.signal)} ${verb} ${rule.minNormalizedDelta} or more deviations from its baseline for ${reads}`;
}

function describeConvergence(rule: ConvergenceRule): string {
  return `At least ${rule.minSignals} signals with an active rule at once`;
}

function triggeredRules(evaluation: Evaluation, ruleSet: RuleSet): TriggeredRuleView[] {
  return evaluation.evidence.map((evidence) => {
    if (evidence.kind === "signal") {
      const rule = ruleSet.rules.find((r) => r.id === evidence.ruleId);
      const description = rule ? describeSignalRule(rule) : evidence.ruleId;
      return {
        id: evidence.ruleId,
        level: evidence.level,
        kind: "signal",
        label: RULE_LABEL[evidence.ruleId] ?? description,
        description,
        signals: [evidence.signal],
      };
    }
    const rule = ruleSet.convergence.find((r) => r.id === evidence.ruleId);
    const description = rule ? describeConvergence(rule) : evidence.ruleId;
    return {
      id: evidence.ruleId,
      level: evidence.level,
      kind: "convergence",
      label: RULE_LABEL[evidence.ruleId] ?? description,
      description,
      signals: evidence.signals,
    };
  });
}

function signalDomain(
  values: number[],
  baseline: SignalBaselineView,
): { min: number; max: number } {
  const all = [...values];
  if (baseline.status === "ready") all.push(baseline.band.low, baseline.band.high);
  if (all.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = (max - min || Math.abs(max) || 1) * DOMAIN_PADDING;
  return { min: min - pad, max: max + pad };
}

export function buildScenarioView(
  scenario: Scenario,
  ruleSet: RuleSet,
  options: EvaluationOptions,
): ScenarioView {
  const observations = buildObservations(scenario);
  const baselineUntil = Date.parse(scenario.baselineUntil);
  const signals = [...new Set(ruleSet.rules.map((r) => r.signal))].sort();

  const bySignal = new Map<string, Observation[]>();
  for (const signal of signals) {
    bySignal.set(
      signal,
      observations.filter((o) => o.signal === signal).sort(byTime),
    );
  }
  const indexOf = (signal: string, observation: Observation) =>
    bySignal.get(signal)?.indexOf(observation) ?? -1;

  const checkpoints: CheckpointView[] = scenario.checkpoints.map((checkpoint, index) => {
    const evaluation = evaluate({
      subjectId: scenario.subjectId,
      observations,
      ruleSet,
      minBaselineObservations: options.minBaselineObservations,
      baselineUntil: scenario.baselineUntil,
      evaluatedAt: checkpoint.evaluatedAt,
    });
    const cutoff = Date.parse(checkpoint.evaluatedAt);

    const signalViews: SignalView[] = signals.map((signal) => {
      const all = bySignal.get(signal) ?? [];
      const meta = scenario.series.find((s) => s.signal === signal);
      const computed = computeBaseline(observations, {
        subjectId: scenario.subjectId,
        signal,
        minObservations: options.minBaselineObservations,
        frozenAt: scenario.baselineUntil,
      });
      const baseline: SignalBaselineView =
        computed.status === "ready"
          ? {
              status: "ready",
              center: computed.center,
              variability: computed.variability,
              sampleCount: computed.sampleCount,
              band: {
                low: computed.center - BAND_SIGMAS * computed.variability,
                high: computed.center + BAND_SIGMAS * computed.variability,
              },
            }
          : {
              status: "insufficient",
              sampleCount: computed.sampleCount,
              minObservations: computed.minObservations,
            };

      const visible = all.filter((o) => Date.parse(o.observedAt) <= cutoff);
      const latestObservation = visible
        .filter(isEvaluable)
        .filter((o): o is NumericObservation => isNumericObservation(o))
        .at(-1);

      let deviation: SignalDeviation | null = null;
      if (latestObservation) {
        const result = baselineDelta(computed, latestObservation);
        if (result.ok) deviation = result.value;
      }

      const numericValues = all
        .filter(isEvaluable)
        .filter((o): o is NumericObservation => isNumericObservation(o))
        .map((o) => o.value);

      return {
        signal,
        label: signalLabel(signal),
        unit: meta?.unit ?? "",
        provenance: {
          type: all[0]?.provenance.type ?? "synthetic",
          source: all[0]?.provenance.source ?? "",
          ...(all[0]?.provenance.device === undefined ? {} : { device: all[0].provenance.device }),
        },
        baseline,
        latest: latestObservation
          ? { value: latestObservation.value, observedAt: latestObservation.observedAt }
          : null,
        deviation,
        firedRuleIds: evaluation.evidence
          .filter((e) => e.kind === "signal" && e.signal === signal)
          .map((e) => e.ruleId),
        points: visible.map((o) => ({
          index: indexOf(signal, o),
          observedAt: o.observedAt,
          value: typeof o.value === "number" ? o.value : null,
          quality: o.quality.state,
        })),
        totalPoints: all.length,
        baselineEndIndex: all.filter((o) => Date.parse(o.observedAt) < baselineUntil).length - 1,
        domain: signalDomain(numericValues, baseline),
      };
    });

    return {
      index,
      label: checkpoint.label,
      evaluatedAt: checkpoint.evaluatedAt,
      status: evaluation.status,
      rules: triggeredRules(evaluation, ruleSet),
      limitations: evaluation.limitations.map((code) =>
        translateLimitation(code, options.minBaselineObservations),
      ),
      signals: signalViews,
    };
  });

  const copy = SCENARIO_COPY[scenario.id];
  const provenanceTypes = [...new Set(observations.map((o) => o.provenance.type))].sort() as ProvenanceType[];

  return {
    id: scenario.id,
    title: copy?.title ?? scenario.title,
    description: copy?.description ?? scenario.description ?? "",
    subjectId: scenario.subjectId,
    baselineUntil: scenario.baselineUntil,
    ruleSetVersion: ruleSet.version,
    engineVersion: ENGINE_VERSION,
    provenanceTypes,
    checkpoints,
  };
}

export function buildEvaluationBoard(
  scenarios: Scenario[],
  ruleSet: RuleSet,
  options: EvaluationOptions,
): EvaluationBoard {
  return { scenarios: scenarios.map((s) => buildScenarioView(s, ruleSet, options)) };
}
