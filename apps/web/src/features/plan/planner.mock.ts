import { ok } from "../../shared/result.ts";
import { mockSource } from "../../shared/source.ts";
import type { CarePlanner, PlanInput } from "./planner.port.ts";

type Random = () => number;
type RiskLevel = PlanInput["riskLevel"];

const STEPS: Record<RiskLevel, string[]> = {
  low: [
    "Keep the usual exercise and sleep routine.",
    "Repeat the daily vital signs check at the scheduled time.",
    "Log hydration and meals for the next 24 hours.",
    "Share the daily check-in with the flight surgeon.",
  ],
  moderate: [
    "Repeat the measurements after a rest period.",
    "Adjust the work schedule to allow a longer sleep window.",
    "Increase hydration and review the radiation shelter plan.",
    "Do an extra check-in with Sentry within the next 6 hours.",
    "Ask the flight surgeon to review the trend.",
  ],
  high: [
    "Suspend non-essential activities and rest.",
    "Repeat the measurements after 15 minutes.",
    "Notify the flight surgeon now.",
    "Prepare the radiation shelter if space weather is elevated.",
    "Prepare to escalate to Earth control.",
  ],
};

const UNCERTAINTY = [
  "Preliminary draft. It does not use the crew member's full history and requires medical validation.",
  "The steps are generic and have not been validated by a physician.",
  "The confidence and limits of the analysis are unknown; medical validation is required.",
];

function pick<T>(items: T[], random: Random): T {
  return items[Math.min(Math.floor(random() * items.length), items.length - 1)];
}

function sample<T>(items: T[], count: number, random: Random): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function createMockPlanner({
  random = Math.random,
}: { random?: Random } = {}): CarePlanner {
  return {
    async draft(input) {
      const focus = input.concerns.length
        ? input.concerns.join(", ")
        : "no flagged signals";
      return ok({
        steps: [
          `Review the flagged signals: ${focus}.`,
          ...sample(STEPS[input.riskLevel], 3, random),
        ],
        uncertainty: pick(UNCERTAINTY, random),
        requiresHumanValidation: true,
        source: mockSource("simulated-medgemma"),
      });
    },
  };
}
