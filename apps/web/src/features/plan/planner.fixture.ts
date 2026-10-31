import "server-only";

import { readFixture } from "../../server/fixtures.ts";
import { err, ok } from "../../shared/result.ts";
import { mockSource } from "../../shared/source.ts";
import type { CarePlanner } from "./planner.port.ts";
import { plannerOutputSchema } from "./planner.schema.ts";

export function createFixturePlanner(): CarePlanner {
  return {
    async draft() {
      try {
        const data = await readFixture("plan", plannerOutputSchema);
        return ok({
          ...data,
          requiresHumanValidation: true as const,
          source: mockSource("fixture"),
        });
      } catch {
        return err("Plan fixture is missing or invalid");
      }
    },
  };
}
