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
  "session-closed": "The session has already ended.",
  "step-not-skippable": "This step is not optional: complete it or mark it as failed.",
  "already-at-first-step": "You are already at the first step.",
  "reset-not-allowed-in-live": "A live session cannot be reset. Abort it and start another.",
  "invalid-session": "The saved session is not valid and was discarded.",
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
