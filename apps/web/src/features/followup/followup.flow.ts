import { randomUUID } from "node:crypto";

import { err, ok, type Result } from "../../shared/result.ts";
import { deliveredKeys } from "../earth/earth.delivery.ts";
import type { EarthState, NewPacket } from "../earth/earth.types.ts";
import { roleKey } from "../notifications/notifications.logic.ts";
import type { NotificationsRepository } from "../notifications/notifications.repository.ts";
import { isEvaluable } from "../observation/observation.logic.ts";
import type { ObservationsRepository } from "../observation/observation.repository.ts";
import type { Observation } from "../observation/observation.types.ts";
import type { PlanRecord } from "../plan/plan.record.ts";
import type { PlansRepository } from "../plan/plan.repository.ts";
import { SENTRY_CALIBRATION } from "../sentry/sentry.logic.ts";
import { buildFollowUpContract } from "./followup.contract.ts";
import { describeReason, describeStatus } from "./followup.display.ts";
import { evaluateFollowUp } from "./followup.logic.ts";
import { followUpFeedbackSchema, type FollowUpDecision, type FollowUpRecord, type WindowReport } from "./followup.record.ts";
import type { FollowUpsRepository } from "./followup.repository.ts";
import type { FollowUpTarget, NotEvaluableReason } from "./followup.types.ts";

export type Timing = { windowDays: number; windowCount: number; referenceDays: number };

type Deps = {
  followups: FollowUpsRepository;
  plans: PlansRepository;
  observations: ObservationsRepository;
  notifications: NotificationsRepository;
  enqueue: (input: Omit<NewPacket, "id">) => Promise<unknown>;
  labelFor: (subjectId: string) => string;
  timing?: () => Timing;
  targets?: FollowUpTarget[];
  throttleMs?: number;
  makeId?: () => string;
  now?: () => string;
};

export type FollowUpFlow = ReturnType<typeof createFollowUpFlow>;

export const DEFAULT_TIMING: Timing = { windowDays: 3, windowCount: 4, referenceDays: 3 };
const DEFAULT_TARGETS: FollowUpTarget[] = [{ signal: "heartRate", expectedDirection: "decrease" }];
const SIGNAL = "heartRate";

export function createFollowUpFlow(deps: Deps) {
  const makeId = deps.makeId ?? (() => randomUUID());
  const targets = deps.targets ?? DEFAULT_TARGETS;
  let lastRun = 0;

  async function baselineFrozenAt(subjectId: string): Promise<string | null> {
    const oldest = await deps.observations.listBySubject(subjectId, {
      signal: SIGNAL,
      limit: SENTRY_CALIBRATION + 20,
    });
    const valid = oldest.filter(isEvaluable);
    if (valid.length < SENTRY_CALIBRATION) return null;
    return new Date(Date.parse(valid[SENTRY_CALIBRATION - 1].observedAt) + 1).toISOString();
  }

  async function createFor(plan: PlanRecord, nowMs: number): Promise<FollowUpRecord | null> {
    const frozen = await baselineFrozenAt(plan.subjectId);
    if (!frozen) return null;
    const startedAt = plan.decided?.at ?? plan.updatedAt;
    if (Date.parse(frozen) > Date.parse(startedAt)) return null;

    const timing = deps.timing?.() ?? DEFAULT_TIMING;
    const contract = buildFollowUpContract({
      subjectId: plan.subjectId,
      planStartedAt: startedAt,
      baselineFrozenAt: frozen,
      targets,
      ...timing,
    });
    const at = new Date(nowMs).toISOString();
    const { record, duplicate } = await deps.followups.add({
      id: `fu-${makeId()}`,
      planId: plan.id,
      subjectId: plan.subjectId,
      status: "active",
      contract,
      reports: [],
      createdAt: at,
      updatedAt: at,
    });
    if (!duplicate) {
      await deps.notifications.add({
        dedupeKey: `followup-start:${record.id}`,
        kind: "followup",
        priority: "normal",
        title: "Follow-up started",
        body: `${deps.labelFor(plan.subjectId)}: ${contract.windows.length} review windows`,
        memberId: plan.subjectId,
        audience: [roleKey("cmo")],
        payload: { followUpId: record.id, planId: plan.id },
      });
    }
    return record;
  }

  async function load(record: FollowUpRecord): Promise<Observation[]> {
    const [oldest, recent] = await Promise.all([
      deps.observations.listBySubject(record.subjectId, { signal: SIGNAL, limit: SENTRY_CALIBRATION + 20 }),
      deps.observations.listBySubject(record.subjectId, {
        signal: SIGNAL,
        since: record.contract.referenceWindow.start,
        limit: 5000,
      }),
    ]);
    return [...new Map([...oldest, ...recent].map((o) => [o.id, o])).values()];
  }

  async function announce(record: FollowUpRecord, report: WindowReport): Promise<void> {
    const label = deps.labelFor(record.subjectId);
    await deps.enqueue({
      idempotencyKey: `followup-report:${record.id}:${report.windowId}`,
      kind: "followup_report",
      direction: "to_earth",
      payload: {
        followUpId: record.id,
        planId: record.planId,
        subjectRef: record.subjectId,
        windowId: report.windowId,
        label: report.label,
        windowStart: report.start,
        windowEnd: report.end,
        status: report.status,
        reasons: report.reasons,
        escalate: report.escalate,
        reportedAt: report.reportedAt,
      },
    });
    const reason = report.reasons[0] as NotEvaluableReason | undefined;
    await deps.notifications.add({
      dedupeKey: `followup-window:${record.id}:${report.windowId}`,
      kind: "followup",
      priority: report.status === "worsening" ? "high" : "normal",
      title: `${report.label} closed`,
      body: `${label}: ${describeStatus(report.status)}${reason ? `. ${describeReason(reason)}` : ""}`,
      memberId: record.subjectId,
      audience: report.status === "worsening" ? [roleKey("cmo"), roleKey("commander")] : [roleKey("cmo")],
      payload: { followUpId: record.id, windowId: report.windowId, status: report.status },
    });
  }

  async function closeDue(record: FollowUpRecord, nowMs: number): Promise<number> {
    const reported = new Set(record.reports.map((r) => r.windowId));
    const due = record.contract.windows.filter((w) => Date.parse(w.end) <= nowMs && !reported.has(w.id));
    if (due.length === 0) return 0;

    const evaluatedAt = new Date(nowMs).toISOString();
    const result = evaluateFollowUp({ contract: record.contract, observations: await load(record), evaluatedAt });
    const latest = result.windows.at(-1)?.windowId;
    const reports: WindowReport[] = due.flatMap((window) => {
      const found = result.windows.find((w) => w.windowId === window.id);
      if (!found) return [];
      return [
        {
          windowId: found.windowId,
          label: found.label,
          start: found.start,
          end: found.end,
          status: found.status,
          reasons: found.reasons,
          escalate: found.status === "worsening" && found.windowId === latest,
          reportedAt: evaluatedAt,
          feedback: [],
        },
      ];
    });
    for (const report of reports) await announce(record, report);

    const updated = await deps.followups.update(record.id, (current) => {
      const have = new Set(current.reports.map((r) => r.windowId));
      const merged = [...current.reports, ...reports.filter((r) => !have.has(r.windowId))];
      return ok({
        ...current,
        reports: merged,
        status: merged.length >= current.contract.windows.length ? "closed" : "active",
        updatedAt: evaluatedAt,
      });
    });
    if (updated.ok && updated.value.status === "closed") {
      await deps.notifications.add({
        dedupeKey: `followup-done:${record.id}`,
        kind: "followup",
        priority: "normal",
        title: "Follow-up complete",
        body: `${deps.labelFor(record.subjectId)}: all windows closed`,
        memberId: record.subjectId,
        audience: [roleKey("cmo")],
        payload: { followUpId: record.id },
      });
    }
    return reports.length;
  }

  async function sync(nowMs: number, options: { force?: boolean } = {}): Promise<{ created: number; reported: number; skipped: boolean }> {
    if (!options.force && nowMs - lastRun < (deps.throttleMs ?? 30_000)) {
      return { created: 0, reported: 0, skipped: true };
    }
    lastRun = nowMs;

    let created = 0;
    for (const plan of await deps.plans.list({ statuses: ["approved"], limit: 200 })) {
      if (await deps.followups.getByPlan(plan.id)) continue;
      try {
        if (await createFor(plan, nowMs)) created += 1;
      } catch {
        // an approved plan without a usable baseline simply has no follow-up yet
      }
    }

    let reported = 0;
    for (const record of await deps.followups.listActive()) reported += await closeDue(record, nowMs);
    return { created, reported, skipped: false };
  }

  const VERB: Record<FollowUpDecision, string> = { ack: "saw the report", comment: "commented" };

  async function earthFeedback(input: {
    followUpId: string;
    windowId: string;
    decision: FollowUpDecision;
    note: string;
    reviewerId: string;
  }): Promise<Result<{ responseId: string }>> {
    const record = await deps.followups.get(input.followUpId);
    if (!record) return err("Follow-up not found.");
    if (!record.reports.some((r) => r.windowId === input.windowId)) return err("That window has no report.");
    const note = input.note.trim();
    if (input.decision === "comment" && note.length < 3) return err("Write a note to comment.");

    const responseId = makeId();
    await deps.enqueue({
      idempotencyKey: `followup-feedback:${responseId}`,
      kind: "followup_feedback",
      direction: "to_station",
      payload: {
        followUpId: record.id,
        windowId: input.windowId,
        responseId,
        decision: input.decision,
        note,
        reviewerId: input.reviewerId,
        decidedAt: (deps.now ?? (() => new Date().toISOString()))(),
      },
    });
    return ok({ responseId });
  }

  async function reconcile(state: EarthState): Promise<number> {
    const delivered = deliveredKeys(state);
    let applied = 0;
    for (const packet of state.queue) {
      if (packet.kind !== "followup_feedback" || !delivered.has(packet.idempotencyKey)) continue;
      const { followUpId, windowId } = packet.payload;
      const parsed = followUpFeedbackSchema.safeParse({
        responseId: packet.payload.responseId,
        decision: packet.payload.decision,
        note: packet.payload.note,
        reviewerId: packet.payload.reviewerId,
        at: packet.payload.decidedAt,
      });
      if (typeof followUpId !== "string" || typeof windowId !== "string" || !parsed.success) continue;
      const feedback = parsed.data;

      let didApply = false;
      const result = await deps.followups.update(followUpId, (record) => {
        const target = record.reports.find((r) => r.windowId === windowId);
        if (!target || target.feedback.some((f) => f.responseId === feedback.responseId)) return ok(record);
        didApply = true;
        return ok({
          ...record,
          reports: record.reports.map((r) =>
            r.windowId === windowId ? { ...r, feedback: [...r.feedback, feedback] } : r,
          ),
          updatedAt: feedback.at,
        });
      });
      if (!result.ok || !didApply) continue;
      applied += 1;

      const record = result.value;
      const label = record.reports.find((r) => r.windowId === windowId)?.label ?? windowId;
      await deps.notifications.add({
        dedupeKey: `earth-response:${feedback.responseId}`,
        kind: "earth_response",
        priority: "normal",
        title: "Earth responded",
        body: `${deps.labelFor(record.subjectId)}: ${label} · ${VERB[feedback.decision]}`,
        memberId: record.subjectId,
        audience: [roleKey("cmo"), roleKey("commander")],
        payload: { followUpId, windowId, decision: feedback.decision },
      });
    }
    return applied;
  }

  async function awaitingFeedback(
    state: EarthState,
  ): Promise<{ followUpId: string; subjectId: string; report: WindowReport }[]> {
    const delivered = deliveredKeys(state);
    const pending: { followUpId: string; subjectId: string; report: WindowReport }[] = [];
    for (const record of await deps.followups.listRecent(100)) {
      for (const report of record.reports) {
        if (report.feedback.length === 0 && delivered.has(`followup-report:${record.id}:${report.windowId}`)) {
          pending.push({ followUpId: record.id, subjectId: record.subjectId, report });
        }
      }
    }
    return pending;
  }

  return { sync, earthFeedback, reconcile, awaitingFeedback };
}
