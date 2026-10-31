import type { RiskInput, RiskLevel } from "./classifier.port.ts";

export type RiskRequest = RiskInput & { id: string };

export type RiskBadgeDTO = {
  level: RiskLevel;
  probabilities: Record<RiskLevel, number>;
  confidence: number;
  lowConfidence: boolean;
  calibrated: boolean;
  provider: string;
  mode: "live" | "cache" | "mock";
};
