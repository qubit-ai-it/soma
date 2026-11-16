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

const number = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });

type Source = Pick<MissionMemberDTO, "flags" | "vitals" | "cumulativeDoseMsv">;

// Each flag with the reading that raised it and the limit it crossed
export function flagCards({ flags, vitals, cumulativeDoseMsv }: Source): FlagCard[] {
  const detail: Record<CrewFlagCode, Omit<FlagCard, "code" | "title">> = {
    "low-spo2": {
      value: `${number.format(vitals.spo2Pct)} %`,
      line: `Mínimo ${THRESHOLDS.minSpo2Pct} %`,
      icon: "pulmonology",
      tone: "danger",
    },
    "high-heart-rate": {
      value: `${number.format(vitals.heartRateBpm)} lpm`,
      line: `Máximo ${THRESHOLDS.maxHeartRateBpm} lpm`,
      icon: "cardiology",
      tone: "danger",
    },
    "short-sleep": {
      value: `${number.format(vitals.sleepHours)} h`,
      line: `Mínimo ${THRESHOLDS.minSleepHours} h`,
      icon: "bedtime",
      tone: "warn",
    },
    "high-dose": {
      value: `${number.format(cumulativeDoseMsv)} mSv`,
      line: `Máximo ${THRESHOLDS.maxDoseMsv} mSv`,
      icon: "radiology",
      tone: "danger",
    },
  };
  return flags.map((flag) => ({ code: flag.code, title: flag.label, ...detail[flag.code] }));
}
