import { followUpContractSchema } from "./followup.schema.ts";
import type { FollowUpContract, FollowUpTarget } from "./followup.types.ts";

const DAY_MS = 86_400_000;

type BuildInput = {
  subjectId: string;
  planStartedAt: string;
  baselineFrozenAt: string;
  targets: FollowUpTarget[];
  windowDays?: number;
  windowCount?: number;
  referenceDays?: number;
};

const iso = (ms: number) => new Date(ms).toISOString().replace(".000Z", "Z");

export function buildFollowUpContract(input: BuildInput): FollowUpContract {
  const { windowDays = 3, windowCount = 4, referenceDays = 3 } = input;
  const start = Date.parse(input.planStartedAt);
  if (Date.parse(input.baselineFrozenAt) > start) {
    throw new Error("baseline must be frozen at or before the plan start");
  }

  return followUpContractSchema.parse({
    subjectId: input.subjectId,
    planStartedAt: input.planStartedAt,
    baselineFrozenAt: input.baselineFrozenAt,
    minBaselineObservations: 5,
    referenceWindow: { start: iso(start - referenceDays * DAY_MS), end: iso(start) },
    targets: input.targets,
    windows: Array.from({ length: windowCount }, (_, i) => ({
      id: `w${i + 1}`,
      label: `Window ${i + 1}`,
      start: iso(start + i * windowDays * DAY_MS),
      end: iso(start + (i + 1) * windowDays * DAY_MS),
    })),
    thresholds: {
      improveFraction: 0.25,
      worsenFraction: 0.1,
      minReferenceHarm: 1,
      minObservationsPerWindow: 2,
    },
    hysteresis: { consecutiveWindows: 3 },
    adherence: {
      plannedStepsPerWindow: 12,
      plannedXrSessionsPerWindow: 1,
      minRatio: 0.75,
      maxDrop: 0.3,
    },
  });
}
