import type { z } from "zod";

import type { crewMemberSchema, vitalsSchema } from "./crew.schema.ts";

export type Vitals = z.infer<typeof vitalsSchema>;
export type CrewMember = z.infer<typeof crewMemberSchema>;

export type CrewFlagCode =
  | "low-spo2"
  | "high-heart-rate"
  | "short-sleep"
  | "high-dose";

export type CrewFlag = { code: CrewFlagCode; label: string };

export type Attention = "nominal" | "watch" | "review";

/** What the UI receives: serializable, with derived fields already computed. */
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
