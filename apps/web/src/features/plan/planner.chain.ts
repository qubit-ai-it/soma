import { err } from "../../shared/result.ts";
import type { CarePlanner } from "./planner.port.ts";

export function createFallbackPlanner(chain: CarePlanner[]): CarePlanner {
  return {
    async draft(input) {
      const failures: string[] = [];
      for (const planner of chain) {
        const result = await planner.draft(input);
        if (result.ok) return result;
        failures.push(result.error);
      }
      return err(`All planners failed: ${failures.join("; ")}`);
    },
  };
}
