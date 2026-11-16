import { THRESHOLDS } from "./crew.logic.ts";
import type { CrewFlagCode, MissionMemberDTO } from "./crew.types.ts";

export type FlagCard = {
  code: CrewFlagCode;
  title: string;
  value: string;
  line: string;
  icon: string;
  tone: "warn" | "danger";
};

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

type Source = Pick<MissionMemberDTO, "flags" | "vitals" | "cumulativeDoseMsv">;

// Each flag with the reading that raised it and the limit it crossed
export function flagCards({ flags, vitals, cumulativeDoseMsv }: Source): FlagCard[] {
  const detail: Record<CrewFlagCode, Omit<FlagCard, "code" | "title">> = {
    "low-spo2": {
      value: `${number.format(vitals.spo2Pct)} %`,
      line: `Minimum ${THRESHOLDS.minSpo2Pct} %`,
      icon: "pulmonology",
      tone: "danger",
    },
    "high-heart-rate": {
      value: `${number.format(vitals.heartRateBpm)} bpm`,
      line: `Maximum ${THRESHOLDS.maxHeartRateBpm} bpm`,
      icon: "cardiology",
      tone: "danger",
    },
    "short-sleep": {
      value: `${number.format(vitals.sleepHours)} h`,
      line: `Minimum ${THRESHOLDS.minSleepHours} h`,
      icon: "bedtime",
      tone: "warn",
    },
    "high-dose": {
      value: `${number.format(cumulativeDoseMsv)} mSv`,
      line: `Maximum ${THRESHOLDS.maxDoseMsv} mSv`,
      icon: "radiology",
      tone: "danger",
    },
  };
  return flags.map((flag) => ({ code: flag.code, title: flag.label, ...detail[flag.code] }));
}
