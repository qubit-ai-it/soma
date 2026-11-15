import type { Observation } from "./observation.types.ts";

export function isEvaluable(observation: Observation): boolean {
  return observation.quality.state === "valid";
}
