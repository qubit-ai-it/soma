import type { Result } from "../../shared/result.ts";
import {
  abortSession,
  completeStep,
  failStep,
  goBack,
  resetSession,
  skipStep,
} from "./procedure.machine.ts";
import type { MachineError, Procedure, SessionState } from "./procedure.types.ts";

export const CAPTURE_STEP_ID = "capture-image";

export type SessionAction =
  | { type: "complete" }
  | { type: "skip" }
  | { type: "fail"; note?: string }
  | { type: "back" }
  | { type: "reset" }
  | { type: "abort" };

export function applyAction(
  procedure: Procedure,
  state: SessionState,
  action: SessionAction,
  at: string,
): Result<SessionState, MachineError> {
  switch (action.type) {
    case "complete":
      return completeStep(procedure, state, at);
    case "skip":
      return skipStep(procedure, state, at);
    case "fail":
      return failStep(procedure, state, at, action.note);
    case "back":
      return goBack(procedure, state, at);
    case "reset":
      return resetSession(procedure, state, at);
    case "abort":
      return abortSession(procedure, state, at);
  }
}

const ERROR_MESSAGES: Record<MachineError, string> = {
  "session-closed": "La sesión ya terminó.",
  "step-not-skippable": "Este paso no es opcional: complétalo o márcalo como fallido.",
  "already-at-first-step": "Ya estás en el primer paso.",
  "reset-not-allowed-in-live": "No se puede reiniciar una sesión en vivo. Abórtala y empieza otra.",
  "invalid-session": "La sesión guardada no es válida y se descartó.",
};

export function describeMachineError(error: MachineError): string {
  return ERROR_MESSAGES[error];
}

export function isCaptureStep(procedure: Procedure, state: SessionState): boolean {
  return (
    state.phase === "in-progress" && procedure.steps[state.currentIndex]?.id === CAPTURE_STEP_ID
  );
}

export function canSwitchMode(state: SessionState): boolean {
  return state.mode === "practice" || state.phase !== "in-progress";
}
