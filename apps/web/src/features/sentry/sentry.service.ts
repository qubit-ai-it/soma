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
  STALE_AFTER_MS,
  staleEvaluation,
  staleMinutes,
} from "./sentry.logic.ts";
import {
  backfillObservations,
  blockStartsToEmit,
  profileFor,
  syntheticHeartRate,
  type ProfileSource,
} from "./sentry.simulation.ts";

type Deps = {
  observations: ObservationsRepository;
  evaluations: EvaluationsRepository;
  notifications: NotificationsRepository;
  raiseAlert: (input: RaiseAlertInput) => Promise<Result<Alert>>;
  members: () => Promise<readonly ProfileSource[]>;
  memberFor: (subjectId: string) => string;
  labelFor: (memberId: string) => string;
  onEvaluationSaved?: (evaluation: StoredEvaluation) => Promise<unknown>;
};

export type ProcessOutcome =
  | { phase: "calibrating" }
  | { phase: "evaluated"; evaluation: StoredEvaluation; saved: boolean; raised: boolean };

const PRIORITY = { F3: "critical", F2: "high", NOT_EVALUABLE: "normal" } as const;
const LEVEL_NAME = { F3: "F3", F2: "F2", NOT_EVALUABLE: "Not evaluable" } as const;

export type SentryService = ReturnType<typeof createSentryService>;

export function createSentryService(deps: Deps) {
  let lastStaleRun = 0;

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
    for (const member of await deps.members()) {
      const subject = member.id;
      const profile = profileFor(member);
      const heartRate = { signal: "heartRate", limit: 1 } as const;
      let [first] = await deps.observations.listBySubject(subject, heartRate);
      const backfilled = !first;
      if (backfilled) {
        await deps.observations.addMany(backfillObservations(subject, profile, nowMs));
        [first] = await deps.observations.listBySubject(subject, heartRate);
      }
      const [last] = await deps.observations.listBySubject(subject, { ...heartRate, newest: true });
      const deviceLive = last?.provenance.type === "real" && nowMs - Date.parse(last.observedAt) < STALE_AFTER_MS;
      const starts = deviceLive ? [] : blockStartsToEmit(backfilled ? null : (last?.observedAt ?? null), nowMs);
      const t0 = first ? Date.parse(first.observedAt) - BIN_MS : (starts[0] ?? nowMs);
      await deps.observations.addMany(starts.map((start) => syntheticHeartRate(subject, start, t0, profile)));
      summary.push({ subject, emitted: starts.length, outcome: await process(subject) });
    }
    return summary;
  }

  async function checkStale(
    nowMs: number,
    subjects: readonly string[],
    options: { force?: boolean } = {},
  ): Promise<{ subject: string; staleMinutes: number }[]> {
    if (!options.force && nowMs - lastStaleRun < 60_000) return [];
    lastStaleRun = nowMs;

    const flagged: { subject: string; staleMinutes: number }[] = [];
    for (const subject of subjects) {
      const latest = await deps.evaluations.latest(subject);
      if (!latest || latest.status === "NOT_EVALUABLE") continue;
      const [last] = await deps.observations.listBySubject(subject, { signal: "heartRate", limit: 1, newest: true });
      if (!last || nowMs - Date.parse(last.observedAt) < STALE_AFTER_MS) continue;

      await deps.evaluations.saveIfChanged(staleEvaluation(subject, nowMs));
      const minutes = staleMinutes(last.observedAt, nowMs);
      const memberId = deps.memberFor(subject);
      const label = deps.labelFor(memberId);
      const gap = Date.parse(last.observedAt);
      const copy = alertCopy("NOT_EVALUABLE");
      const raised = await deps.raiseAlert({
        alertId: `sentry-${memberId}-NOT_EVALUABLE-stale-${gap}`,
        memberId,
        memberLabel: label,
        level: "NOT_EVALUABLE",
        title: copy.title,
        action: copy.action,
        actorId: SENTRY_ACTOR,
      });
      if (raised.ok) {
        await deps.notifications.add({
          dedupeKey: `nodata:${memberId}:${gap}`,
          kind: "alert",
          priority: "normal",
          title: `Not evaluable · ${label}`,
          body: `${label}: no data for ${minutes} min`,
          memberId,
          audience: audienceForLevel("NOT_EVALUABLE", memberId),
          payload: { alertId: raised.value.id, level: "NOT_EVALUABLE", memberId },
        });
      }
      flagged.push({ subject, staleMinutes: minutes });
    }
    return flagged;
  }

  return { process, tick, checkStale };
}
