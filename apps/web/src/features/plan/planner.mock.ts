import { ok } from "../../shared/result.ts";
import { mockSource } from "../../shared/source.ts";
import type { CarePlanner } from "./planner.port.ts";

export function createMockPlanner(): CarePlanner {
  return {
    async draft(input) {
      const focus = input.concerns.length
        ? input.concerns.join(", ")
        : "no flagged concerns";
      return ok({
        steps: [
          `Review flagged signals: ${focus}.`,
          "Repeat the measurements after a rest period.",
          "Escalate to the flight surgeon if the signals persist.",
        ],
        uncertainty:
          "Canned mock draft. It does not use the crew member's history or any medical model.",
        requiresHumanValidation: true,
        source: mockSource("mock-planner"),
      });
    },
  };
}
