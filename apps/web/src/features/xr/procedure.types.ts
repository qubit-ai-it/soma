import type { z } from "zod";

import type {
  logEntrySchema,
  procedureSchema,
  procedureStepSchema,
  sessionStateSchema,
  stepStatusSchema,
} from "./procedure.schema.ts";

export type Procedure = z.infer<typeof procedureSchema>;
export type ProcedureStep = z.infer<typeof procedureStepSchema>;
export type StepStatus = z.infer<typeof stepStatusSchema>;
export type LogEntry = z.infer<typeof logEntrySchema>;
export type SessionState = z.infer<typeof sessionStateSchema>;
export type SessionMode = SessionState["mode"];

export type MachineError =
  | "session-closed"
  | "step-not-skippable"
  | "already-at-first-step"
  | "reset-not-allowed-in-live"
  | "invalid-session";
