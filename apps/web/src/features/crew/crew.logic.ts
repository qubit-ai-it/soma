import type {
  Attention,
  CrewCardDTO,
  CrewFlag,
  CrewMember,
} from "./crew.types.ts";

// Illustrative demo thresholds. NOT clinical guidance.
export const THRESHOLDS = {
  minSpo2Pct: 94,
  maxHeartRateBpm: 100,
  minSleepHours: 6,
  maxDoseMsv: 100,
} as const;

export function deriveFlags(member: CrewMember): CrewFlag[] {
  const flags: CrewFlag[] = [];
  if (member.vitals.spo2Pct < THRESHOLDS.minSpo2Pct) {
    flags.push({ code: "low-spo2", label: "SpO₂ baja" });
  }
  if (member.vitals.heartRateBpm > THRESHOLDS.maxHeartRateBpm) {
    flags.push({ code: "high-heart-rate", label: "Frecuencia cardíaca alta" });
  }
  if (member.vitals.sleepHours < THRESHOLDS.minSleepHours) {
    flags.push({ code: "short-sleep", label: "Sueño insuficiente" });
  }
  if (member.cumulativeDoseMsv > THRESHOLDS.maxDoseMsv) {
    flags.push({ code: "high-dose", label: "Dosis acumulada alta" });
  }
  return flags;
}

export function attentionFor(flags: CrewFlag[]): Attention {
  if (flags.length === 0) return "nominal";
  return flags.length === 1 ? "watch" : "review";
}

export function toCrewCard(member: CrewMember): CrewCardDTO {
  const flags = deriveFlags(member);
  return { ...member, flags, attention: attentionFor(flags) };
}
