import { err, ok, type Result } from "../../shared/result.ts";

type Severity = "mild" | "moderate" | "severe";

export type StructuredSelfReport = {
  fatigue: "none" | Severity;
  symptoms: { category: string; severity: Severity }[];
  // an AI-structured report only becomes data once the person confirms it
  confirmedByUser: boolean;
};

const FATIGUE_BASE = { none: 0, mild: 3, moderate: 6, severe: 9 } as const;
const SYMPTOM_WEIGHT = { mild: 0.5, moderate: 1, severe: 1.5 } as const;
const MAX_SCORE = 10;

export function selfReportToScore(report: StructuredSelfReport): Result<number, "not-confirmed"> {
  if (!report.confirmedByUser) return err("not-confirmed");
  const symptoms = report.symptoms.reduce((sum, s) => sum + SYMPTOM_WEIGHT[s.severity], 0);
  return ok(Math.min(MAX_SCORE, FATIGUE_BASE[report.fatigue] + symptoms));
}
