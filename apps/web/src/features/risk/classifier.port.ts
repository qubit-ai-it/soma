import type { Result } from "../../shared/result.ts";
import type { SourceInfo } from "../../shared/source.ts";

export type RiskLevel = "low" | "moderate" | "high";

export type RiskInput = {
  heartRateBpm: number;
  spo2Pct: number;
  sleepHours: number;
  cumulativeDoseMsv: number;
};

export type RiskAssessment = {
  level: RiskLevel;
  probabilities: Record<RiskLevel, number>;
  confidence: number;
  rationale: string;
  /** false when the provider is known to be uncalibrated (Laya, mock). The UI must say so. */
  calibrated: boolean;
  source: SourceInfo;
};

export interface RiskClassifier {
  classify(input: RiskInput): Promise<Result<RiskAssessment>>;
}
