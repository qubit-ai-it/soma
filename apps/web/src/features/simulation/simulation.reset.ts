import { randomCrewPositions } from "./deck.ts";
import type { SimulationState } from "./simulation.ts";

export function restartSituation(current: SimulationState, fresh: SimulationState): SimulationState {
  const positions = randomCrewPositions(fresh.crew.length);
  return {
    ...fresh,
    crew: fresh.crew.map((member, index) => ({ ...member, position: positions[index] })),
    version: current.version + 1,
    revision: current.revision + 1,
  };
}
