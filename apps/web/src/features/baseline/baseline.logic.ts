import { isEvaluable } from "../observation/observation.logic.ts";
import type { Observation } from "../observation/observation.types.ts";
import { err, ok, type Result } from "../../shared/result.ts";
import type {
  Baseline,
  BaselineDelta,
  BaselineDeltaError,
  BaselineOptions,
} from "./baseline.types.ts";

const MAD_TO_SIGMA = 1.4826;

type NumericObservation = Observation & { value: number };

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function isNumeric(observation: Observation): observation is NumericObservation {
  return typeof observation.value === "number";
}

export function computeBaseline(
  observations: Observation[],
  options: BaselineOptions,
): Baseline {
  const cutoff = options.frozenAt === undefined ? undefined : Date.parse(options.frozenAt);
  const samples = observations
    .filter((o) => o.subjectId === options.subjectId && o.signal === options.signal)
    .filter(isEvaluable)
    .filter(isNumeric)
    .filter((o) => cutoff === undefined || Date.parse(o.observedAt) < cutoff)
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));

  const insufficient = (reason: "too-few-observations" | "mixed-units"): Baseline => ({
    status: "insufficient",
    reason,
    subjectId: options.subjectId,
    signal: options.signal,
    sampleCount: samples.length,
    minObservations: options.minObservations,
  });

  const units = new Set(samples.map((o) => o.unit));
  if (units.size > 1) return insufficient("mixed-units");
  if (samples.length < options.minObservations || samples.length === 0) {
    return insufficient("too-few-observations");
  }

  const values = samples.map((o) => o.value);
  const center = median(values);
  const variability = median(values.map((v) => Math.abs(v - center))) * MAD_TO_SIGMA;

  return {
    status: "ready",
    method: "median-mad",
    subjectId: options.subjectId,
    signal: options.signal,
    unit: samples[0].unit,
    center,
    variability,
    sampleCount: samples.length,
    windowStart: samples[0].observedAt,
    windowEnd: samples[samples.length - 1].observedAt,
    ...(options.frozenAt === undefined ? {} : { frozenAt: options.frozenAt }),
  };
}

export function baselineDelta(
  baseline: Baseline,
  observation: Observation,
): Result<BaselineDelta, BaselineDeltaError> {
  if (baseline.status !== "ready") return err("baseline-insufficient");
  if (!isEvaluable(observation) || !isNumeric(observation)) {
    return err("observation-not-evaluable");
  }
  if (
    observation.subjectId !== baseline.subjectId ||
    observation.signal !== baseline.signal ||
    observation.unit !== baseline.unit
  ) {
    return err("observation-mismatch");
  }

  const delta = observation.value - baseline.center;
  const normalizedDelta = baseline.variability === 0 ? null : delta / baseline.variability;
  return ok({ delta, normalizedDelta });
}
