import type { z } from "zod";

import type {
  crewMemberSchema,
  vitalSampleSchema,
  vitalsSchema,
} from "./crew.schema.ts";

export type Vitals = z.infer<typeof vitalsSchema>;
export type VitalSample = z.infer<typeof vitalSampleSchema>;
export type CrewMember = z.infer<typeof crewMemberSchema>;

export type CrewFlagCode =
  | "low-spo2"
  | "high-heart-rate"
  | "short-sleep"
  | "high-dose";

export type CrewFlag = { code: CrewFlagCode; label: string };

export type Attention = "nominal" | "watch" | "review";

export type CrewCardDTO = {
  id: string;
  name: string;
  role: string;
  vitals: Vitals;
  cumulativeDoseMsv: number;
  lastCheckIn: string;
  flags: CrewFlag[];
  attention: Attention;
};

export type Trend = "rising" | "falling" | "stable" | "insufficient";
export type VitalTrends = { heartRate: Trend; spo2: Trend; sleep: Trend };

export type Severity = "ok" | "possible-risk" | "risky";
export type Signal = "spo2" | "heartRate" | "sleep" | "dose";
export type Zone = "head" | "thorax" | "abdomen-pelvis";

export type ZoneCause = {
  signal: Signal;
  label: string;
  value: number;
  unit: string;
  severity: Severity;
};
export type ZoneReading = {
  zone: Zone;
  label: string;
  severity: Severity;
  signals: ZoneCause[];
  causes: ZoneCause[];
};

export type MissionMemberDTO = CrewCardDTO & {
  trends: VitalTrends;
  zones: ZoneReading[];
  history: VitalSample[];
};
