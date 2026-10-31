import type { CrewCardDTO } from "@/features/crew/crew.types";
import type { RiskInput } from "@/features/risk/classifier.port";

export function toRiskInput(member: CrewCardDTO): RiskInput {
  return {
    heartRateBpm: member.vitals.heartRateBpm,
    spo2Pct: member.vitals.spo2Pct,
    sleepHours: member.vitals.sleepHours,
    cumulativeDoseMsv: member.cumulativeDoseMsv,
  };
}
