import { err, ok, type Result } from "../../shared/result.ts";
import { sessionStateSchema } from "./procedure.schema.ts";
import type {
  LogEntry,
  MachineError,
  Procedure,
  SessionMode,
  SessionState,
  StepStatus,
} from "./procedure.types.ts";

type Transition = Result<SessionState, MachineError>;

function withStatus(statuses: StepStatus[], index: number, status: StepStatus): StepStatus[] {
  return statuses.map((s, i) => (i === index ? status : s));
}

function withLog(state: SessionState, ...entries: LogEntry[]): LogEntry[] {
  return state.mode === "live" ? [...state.log, ...entries] : state.log;
}

function stepIdAt(procedure: Procedure, index: number): string {
  return procedure.steps[index].id;
}

export function startSession(procedure: Procedure, mode: SessionMode, at: string): SessionState {
  return {
    procedureId: procedure.id,
    mode,
    currentIndex: 0,
    statuses: procedure.steps.map(() => "pending"),
    phase: "in-progress",
    log: mode === "live" ? [{ at, action: "started" }] : [],
  };
}

function advance(
  procedure: Procedure,
  state: SessionState,
  at: string,
  status: "done" | "skipped",
): SessionState {
  const index = state.currentIndex;
  const action = status === "done" ? "completed" : "skipped";
  const statuses = withStatus(state.statuses, index, status);
  const entry: LogEntry = { at, action, stepId: stepIdAt(procedure, index) };

  if (index === procedure.steps.length - 1) {
    return {
      ...state,
      statuses,
      phase: "completed",
      log: withLog(state, entry, { at, action: "finished" }),
    };
  }
  return { ...state, statuses, currentIndex: index + 1, log: withLog(state, entry) };
}

export function completeStep(procedure: Procedure, state: SessionState, at: string): Transition {
  if (state.phase !== "in-progress") return err("session-closed");
  return ok(advance(procedure, state, at, "done"));
}

export function skipStep(procedure: Procedure, state: SessionState, at: string): Transition {
  if (state.phase !== "in-progress") return err("session-closed");
  if (!procedure.steps[state.currentIndex].optional) return err("step-not-skippable");
  return ok(advance(procedure, state, at, "skipped"));
}

export function failStep(
  procedure: Procedure,
  state: SessionState,
  at: string,
  note?: string,
): Transition {
  if (state.phase !== "in-progress") return err("session-closed");
  const entry: LogEntry = {
    at,
    action: "failed",
    stepId: stepIdAt(procedure, state.currentIndex),
    ...(note === undefined ? {} : { note }),
  };
  return ok({
    ...state,
    statuses: withStatus(state.statuses, state.currentIndex, "failed"),
    log: withLog(state, entry),
  });
}

export function goBack(procedure: Procedure, state: SessionState, at: string): Transition {
  if (state.phase === "aborted") return err("session-closed");

  if (state.phase === "completed") {
    const last = state.currentIndex;
    return ok({
      ...state,
      phase: "in-progress",
      statuses: withStatus(state.statuses, last, "pending"),
      log: withLog(state, { at, action: "back", stepId: stepIdAt(procedure, last) }),
    });
  }

  if (state.currentIndex === 0) return err("already-at-first-step");
  const previous = state.currentIndex - 1;
  const statuses = withStatus(withStatus(state.statuses, previous, "pending"), state.currentIndex, "pending");
  return ok({
    ...state,
    currentIndex: previous,
    statuses,
    log: withLog(state, { at, action: "back", stepId: stepIdAt(procedure, previous) }),
  });
}

export function abortSession(procedure: Procedure, state: SessionState, at: string): Transition {
  if (state.phase !== "in-progress") return err("session-closed");
  return ok({
    ...state,
    phase: "aborted",
    log: withLog(state, {
      at,
      action: "aborted",
      stepId: stepIdAt(procedure, state.currentIndex),
    }),
  });
}

export function resetSession(procedure: Procedure, state: SessionState, at: string): Transition {
  if (state.mode === "live") return err("reset-not-allowed-in-live");
  return ok(startSession(procedure, "practice", at));
}

export function restoreSession(raw: unknown, procedure: Procedure): Transition {
  const parsed = sessionStateSchema.safeParse(raw);
  if (!parsed.success) return err("invalid-session");
  const state = parsed.data;
  const consistent =
    state.procedureId === procedure.id &&
    state.statuses.length === procedure.steps.length &&
    state.currentIndex < procedure.steps.length;
  return consistent ? ok(state) : err("invalid-session");
}
