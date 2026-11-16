import type { Result } from "../../shared/result.ts";
import type { RaiseAlertInput } from "../alerts/alerts.service.ts";
import type { Alert } from "../alerts/alerts.types.ts";
import { alertDedupeKey, audienceForLevel } from "../notifications/notifications.logic.ts";
import type { NotificationsRepository } from "../notifications/notifications.repository.ts";
import type { ObservationsRepository } from "../observation/observation.repository.ts";
import type { Observation } from "../observation/observation.types.ts";
import { BIN_MS } from "../live/live.logic.ts";
import type { StoredEvaluation, EvaluationsRepository } from "./evaluations.repository.ts";
import {
  alertCopy,
  clinicalDetailFor,
  DEBOUNCE_WINDOW_MS,
  deriveEvaluation,
  SENTRY_ACTOR,
  SENTRY_CALIBRATION,
  shouldRaise,
} from "./sentry.logic.ts";
import { blockStartsToEmit, SIM_SUBJECTS, syntheticHeartRate } from "./sentry.simulation.ts";

type Deps = {
  observations: ObservationsRepository;
  evaluations: EvaluationsRepository;
  notifications: NotificationsRepository;
  raiseAlert: (input: RaiseAlertInput) => Promise<Result<Alert>>;
  memberFor: (subjectId: string) => string;
  labelFor: (memberId: string) => string;
  onEvaluationSaved?: (evaluation: StoredEvaluation) => Promise<unknown>;
};

export type ProcessOutcome =
  | { phase: "calibrating" }
  | { phase: "evaluated"; evaluation: StoredEvaluation; saved: boolean; raised: boolean };

const PRIORITY = { F3: "critical", F2: "high", NOT_EVALUABLE: "normal" } as const;
const LEVEL_NAME = { F3: "F3", F2: "F2", NOT_EVALUABLE: "No evaluable" } as const;

export type SentryService = ReturnType<typeof createSentryService>;

export function createSentryService(deps: Deps) {
  async function load(subjectId: string): Promise<Observation[]> {
    const options = { signal: "heartRate" } as const;
    const [oldest, newest] = await Promise.all([
      deps.observations.listBySubject(subjectId, { ...options, limit: SENTRY_CALIBRATION + 20 }),
      deps.observations.listBySubject(subjectId, { ...options, limit: 200, newest: true }),
    ]);
    const byId = new Map([...oldest, ...newest].map((o) => [o.id, o]));
    return [...byId.values()];
  }

  async function process(subjectId: string): Promise<ProcessOutcome> {
    const evaluation = deriveEvaluation(await load(subjectId));
    if (!evaluation) return { phase: "calibrating" };

    const result = await deps.evaluations.saveIfChanged(evaluation);
    if (!result.saved) {
      return { phase: "evaluated", evaluation: result.evaluation, saved: false, raised: false };
    }

    try {
      await deps.onEvaluationSaved?.(result.evaluation);
    } catch {
      // a failing follow-up never blocks the evaluation or its alert
    }

    const nowMs = Date.parse(evaluation.evaluatedAt);
    const level = evaluation.status;
    if (!shouldRaise(level, result.history, nowMs)) {
      return { phase: "evaluated", evaluation: result.evaluation, saved: true, raised: false };
    }
    if (level !== "F2" && level !== "F3" && level !== "NOT_EVALUABLE") {
      return { phase: "evaluated", evaluation: result.evaluation, saved: true, raised: false };
    }

    const memberId = deps.memberFor(subjectId);
    const label = deps.labelFor(memberId);
    const copy = alertCopy(level);
    const bucket = Math.floor(nowMs / DEBOUNCE_WINDOW_MS);
    const raised = await deps.raiseAlert({
      alertId: `sentry-${memberId}-${level}-${bucket}`,
      memberId,
      memberLabel: label,
      level,
      title: copy.title,
      action: copy.action,
      clinicalDetail: clinicalDetailFor(evaluation),
      actorId: SENTRY_ACTOR,
    });
    if (!raised.ok) {
      return { phase: "evaluated", evaluation: result.evaluation, saved: true, raised: false };
    }

    await deps.notifications.add({
      dedupeKey: alertDedupeKey(memberId, level, nowMs, DEBOUNCE_WINDOW_MS),
      kind: "alert",
      priority: PRIORITY[level],
      title: `${LEVEL_NAME[level]} · ${label}`,
      body: copy.title,
      memberId,
      audience: audienceForLevel(level, memberId),
      payload: { alertId: raised.value.id, level, memberId },
    });
    return { phase: "evaluated", evaluation: result.evaluation, saved: true, raised: true };
  }

  async function tick(nowMs: number): Promise<{ subject: string; emitted: number; outcome: ProcessOutcome }[]> {
    const summary = [];
    for (const subject of SIM_SUBJECTS) {
      const [last] = await deps.observations.listBySubject(subject, { signal: "heartRate", limit: 1, newest: true });
      const [first] = await deps.observations.listBySubject(subject, { signal: "heartRate", limit: 1 });
      const starts = blockStartsToEmit(last?.observedAt ?? null, nowMs);
      const t0 = first ? Date.parse(first.observedAt) - BIN_MS : (starts[0] ?? nowMs);
      await deps.observations.addMany(starts.map((start) => syntheticHeartRate(subject, start, t0)));
      summary.push({ subject, emitted: starts.length, outcome: await process(subject) });
    }
    return summary;
  }

  return { process, tick };
}
