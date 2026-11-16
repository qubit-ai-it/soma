import type {
  Attention,
  CrewCardDTO,
  CrewFlag,
  CrewMember,
} from "./crew.types.ts";

export const THRESHOLDS = {
  minSpo2Pct: 94,
  maxHeartRateBpm: 100,
  minSleepHours: 6,
  maxDoseMsv: 100,
} as const;

export const RESTING_HEART_RATE = { low: 60, high: THRESHOLDS.maxHeartRateBpm } as const;

// One beat every 60 / bpm seconds, so an animation follows the reading
export function beatDuration(bpm: number): string {
  return `${(60 / Math.min(Math.max(bpm, 30), 200)).toFixed(2)}s`;
}

export function deriveFlags(member: CrewMember): CrewFlag[] {
  const flags: CrewFlag[] = [];
  if (member.vitals.spo2Pct < THRESHOLDS.minSpo2Pct) {
    flags.push({ code: "low-spo2", label: "Low SpO₂" });
  }
  if (member.vitals.heartRateBpm > THRESHOLDS.maxHeartRateBpm) {
    flags.push({ code: "high-heart-rate", label: "High heart rate" });
  }
  if (member.vitals.sleepHours < THRESHOLDS.minSleepHours) {
    flags.push({ code: "short-sleep", label: "Insufficient sleep" });
  }
  if (member.cumulativeDoseMsv > THRESHOLDS.maxDoseMsv) {
    flags.push({ code: "high-dose", label: "High cumulative dose" });
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
