import { baselineDelta, computeBaseline } from "../baseline/baseline.logic.ts";
import type { Baseline } from "../baseline/baseline.types.ts";
import { isEvaluable, isNumericObservation } from "../observation/observation.logic.ts";
import type { Observation } from "../observation/observation.types.ts";
import type {
  EvaluateFollowUpInput,
  FollowUpContract,
  FollowUpResult,
  FollowUpStatus,
  FollowUpTarget,
  FrozenBaselineInfo,
  NotEvaluableReason,
  ReviewWindow,
  SignalWindowResult,
  WindowAdherence,
  WindowResult,
} from "./followup.types.ts";

export const STEPS_SIGNAL = "stepsDone";
export const XR_SIGNAL = "xrSessions";

type ReadyBaseline = Extract<Baseline, { status: "ready" }>;
type Range = { start: string; end: string };

function inRange(observation: Observation, range: Range): boolean {
  const at = Date.parse(observation.observedAt);
  return at >= Date.parse(range.start) && at < Date.parse(range.end);
}

function validValues(observations: Observation[], subjectId: string, signal: string, range: Range) {
  return observations
    .filter((o) => o.subjectId === subjectId && o.signal === signal && inRange(o, range))
    .filter(isEvaluable)
    .filter(isNumericObservation);
}

// harm is the deviation from baseline in the direction the treatment should reverse
function meanHarm(
  baseline: ReadyBaseline,
  observations: ReturnType<typeof validValues>,
  target: FollowUpTarget,
): number | null {
  const sign = target.expectedDirection === "increase" ? -1 : 1;
  const deltas: number[] = [];
  for (const observation of observations) {
    const result = baselineDelta(baseline, observation);
    if (!result.ok || result.value.normalizedDelta === null) return null;
    deltas.push(sign * result.value.normalizedDelta);
  }
  return deltas.length === 0 ? null : deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

function windowAdherence(
  observations: Observation[],
  contract: FollowUpContract,
  window: ReviewWindow,
): WindowAdherence | null {
  const steps = validValues(observations, contract.subjectId, STEPS_SIGNAL, window);
  const xr = validValues(observations, contract.subjectId, XR_SIGNAL, window);
  if (steps.length === 0 || xr.length === 0) return null;
  const sum = (list: typeof steps) => list.reduce((total, o) => total + o.value, 0);
  const stepsDone = sum(steps);
  return {
    stepsDone,
    stepsPlanned: contract.adherence.plannedStepsPerWindow,
    xrSessionsDone: sum(xr),
    xrSessionsPlanned: contract.adherence.plannedXrSessionsPerWindow,
    stepsRatio: stepsDone / contract.adherence.plannedStepsPerWindow,
  };
}

function xrRatio(adherence: WindowAdherence): number {
  return adherence.xrSessionsPlanned === 0 ? 1 : adherence.xrSessionsDone / adherence.xrSessionsPlanned;
}

function adherenceReasons(
  contract: FollowUpContract,
  adherence: WindowAdherence | null,
  previous: WindowAdherence | null,
): NotEvaluableReason[] {
  if (adherence === null) return ["adherence-missing"];
  const { minRatio, maxDrop } = contract.adherence;
  if (adherence.stepsRatio < minRatio || xrRatio(adherence) < minRatio) return ["adherence-low"];
  if (previous && previous.stepsRatio - adherence.stepsRatio > maxDrop) return ["adherence-changed"];
  return [];
}

function combine(signals: SignalWindowResult[]): FollowUpStatus {
  if (signals.some((s) => s.status === "worsening")) return "worsening";
  const improving = signals.filter((s) => s.status === "improving").length;
  return improving * 2 >= signals.length ? "improving" : "stable";
}

export function evaluateFollowUp(input: EvaluateFollowUpInput): FollowUpResult {
  const { contract, observations, evaluatedAt } = input;
  const { thresholds } = contract;
  const closed = contract.windows.filter((w) => Date.parse(w.end) <= Date.parse(evaluatedAt));

  const baselines = new Map<string, Baseline>();
  const references = new Map<string, number | null>();
  for (const target of contract.targets) {
    const baseline = computeBaseline(observations, {
      subjectId: contract.subjectId,
      signal: target.signal,
      minObservations: contract.minBaselineObservations,
      frozenAt: contract.baselineFrozenAt,
    });
    baselines.set(target.signal, baseline);
    const reference = validValues(
      observations,
      contract.subjectId,
      target.signal,
      contract.referenceWindow,
    );
    references.set(
      target.signal,
      baseline.status === "ready" && reference.length >= thresholds.minObservationsPerWindow
        ? meanHarm(baseline, reference, target)
        : null,
    );
  }

  function evaluateSignal(target: FollowUpTarget, window: ReviewWindow): SignalWindowResult {
    const baseline = baselines.get(target.signal);
    const values = validValues(observations, contract.subjectId, target.signal, window);
    const base = { signal: target.signal, observationCount: values.length, recoveredFraction: null };
    const notEvaluable = (reason: NotEvaluableReason): SignalWindowResult => ({
      ...base,
      status: "not-evaluable",
      reason,
    });

    if (baseline?.status !== "ready" || baseline.variability === 0) {
      return notEvaluable("baseline-insufficient");
    }
    const harmRef = references.get(target.signal);
    if (harmRef === null || harmRef === undefined) return notEvaluable("data-quality");
    if (harmRef < thresholds.minReferenceHarm) return notEvaluable("no-reference-deviation");
    if (values.length < thresholds.minObservationsPerWindow) return notEvaluable("data-quality");

    const harm = meanHarm(baseline, values, target);
    if (harm === null) return notEvaluable("data-quality");
    const recoveredFraction = (harmRef - harm) / harmRef;
    const status: FollowUpStatus =
      recoveredFraction >= thresholds.improveFraction
        ? "improving"
        : recoveredFraction <= -thresholds.worsenFraction
          ? "worsening"
          : "stable";
    return { ...base, status, recoveredFraction };
  }

  const windows: WindowResult[] = [];
  let previousAdherence: WindowAdherence | null = null;
  for (const window of closed) {
    const signals = contract.targets.map((target) => evaluateSignal(target, window));
    const adherence = windowAdherence(observations, contract, window);
    const reasons = new Set<NotEvaluableReason>(
      signals.flatMap((s) => (s.reason ? [s.reason] : [])),
    );
    for (const reason of adherenceReasons(contract, adherence, previousAdherence)) reasons.add(reason);

    windows.push({
      windowId: window.id,
      label: window.label,
      start: window.start,
      end: window.end,
      status: reasons.size > 0 ? "not-evaluable" : combine(signals),
      reasons: [...reasons],
      signals,
      adherence,
    });
    previousAdherence = adherence;
  }

  let consecutiveImproving = 0;
  for (let i = windows.length - 1; i >= 0 && windows[i].status === "improving"; i--) {
    consecutiveImproving++;
  }
  const latest = windows.at(-1);
  const worsening = latest?.status === "worsening";

  const frozen: FrozenBaselineInfo[] = [];
  for (const [signal, baseline] of baselines) {
    if (baseline.status === "ready") {
      frozen.push({
        signal,
        center: baseline.center,
        variability: baseline.variability,
        sampleCount: baseline.sampleCount,
        frozenAt: contract.baselineFrozenAt,
      });
    }
  }

  return {
    windows,
    baselines: frozen,
    consecutiveImproving,
    stepDown: {
      proposed: consecutiveImproving >= contract.hysteresis.consecutiveWindows,
      automatic: false,
      requiresHumanConfirmation: true,
    },
    escalate: {
      notifyEarth: worsening,
      reason: worsening ? "latest-window-worsening" : null,
    },
  };
}
