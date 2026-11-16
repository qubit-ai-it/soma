import type { QualityState } from "../observation/observation.types.ts";
import type { LogEntry, StepStatus } from "./procedure.types.ts";

const STATUS: Record<StepStatus, string> = {
  pending: "Pending",
  done: "Done",
  skipped: "Skipped",
  failed: "Failed",
};

const LOG_ACTION: Record<LogEntry["action"], string> = {
  started: "Session started",
  completed: "Step completed",
  skipped: "Step skipped",
  failed: "Step failed",
  back: "Went back to the previous step",
  finished: "Procedure finished",
  aborted: "Session aborted",
};

const QUALITY: Record<QualityState, string> = {
  valid: "Valid",
  suspect: "Doubtful",
  invalid: "Not valid",
  missing: "No data",
};

export function statusLabel(status: StepStatus): string {
  return STATUS[status];
}

export function logActionLabel(action: LogEntry["action"]): string {
  return LOG_ACTION[action];
}

export function qualityLabel(state: QualityState): string {
  return QUALITY[state];
}
