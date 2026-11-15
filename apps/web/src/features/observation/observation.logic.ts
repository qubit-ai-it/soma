import type { Observation } from "./observation.types.ts";

export type NumericObservation = Observation & { value: number };

export function isEvaluable(observation: Observation): boolean {
  return observation.quality.state === "valid";
}

export function isNumericObservation(
  observation: Observation,
): observation is NumericObservation {
  return typeof observation.value === "number";
}
