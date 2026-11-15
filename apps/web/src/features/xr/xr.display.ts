import type { QualityState } from "../observation/observation.types.ts";
import type { LogEntry, StepStatus } from "./procedure.types.ts";

const STATUS: Record<StepStatus, string> = {
  pending: "Pendiente",
  done: "Hecho",
  skipped: "Omitido",
  failed: "Fallido",
};

const LOG_ACTION: Record<LogEntry["action"], string> = {
  started: "Sesión iniciada",
  completed: "Paso completado",
  skipped: "Paso omitido",
  failed: "Paso fallido",
  back: "Volvió al paso anterior",
  finished: "Procedimiento terminado",
  aborted: "Sesión abortada",
};

const QUALITY: Record<QualityState, string> = {
  valid: "Válida",
  suspect: "Dudosa",
  invalid: "No válida",
  missing: "Sin dato",
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
