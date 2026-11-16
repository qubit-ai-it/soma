import { randomUUID } from "node:crypto";

import { err, ok, type Result } from "../../shared/result.ts";
import type { AuditRepository } from "../alerts/alerts.repository.ts";
import type { NewAuditEntry } from "../alerts/alerts.types.ts";
import { deliveredKeys } from "../earth/earth.delivery.ts";
import type { EarthState, NewPacket, Packet } from "../earth/earth.types.ts";
import { roleKey } from "../notifications/notifications.logic.ts";
import type { NotificationsRepository } from "../notifications/notifications.repository.ts";
import type { StoredEvaluation } from "../sentry/evaluations.repository.ts";
import type { Role } from "../roles/roles.types.ts";
import { applyEarthResponse, approveOnBoard, submitForReview } from "./plan.lifecycle.ts";
import {
  planReviewSchema,
  type EarthDecision,
  type PlanRecord,
  type PlanReview,
} from "./plan.record.ts";
import type { PlansRepository } from "./plan.repository.ts";

export type PlanDraft = {
  steps: string[];
  uncertainty: string;
  source: { provider: string; mode: "live" | "cache" | "mock" };
};

type Actor = { role: Role; actorId: string };

type Deps = {
  plans: PlansRepository;
  audit: AuditRepository;
  notifications: NotificationsRepository;
  draft: (evaluation: StoredEvaluation) => Promise<Result<PlanDraft>>;
  enqueue: (input: Omit<NewPacket, "id">) => Promise<{ packet: Packet; duplicate: boolean }>;
  linkStatus: () => Promise<"connected" | "disconnected">;
  labelFor: (subjectId: string) => string;
  concernsFor?: (evaluation: StoredEvaluation) => string[];
  now?: () => string;
  makeId?: () => string;
};

export type PlanFlow = ReturnType<typeof createPlanFlow>;

const MAX_STEPS = 12;
const VERB: Record<EarthDecision, string> = {
  approve: "aprobó el plan",
  changes: "pidió cambios",
  comment: "comentó",
};

export const requestKey = (plan: Pick<PlanRecord, "id" | "revision">) =>
  `plan-review-request:${plan.id}:${plan.revision}`;

export function createPlanFlow(deps: Deps) {
  const now = deps.now ?? (() => new Date().toISOString());
  const makeId = deps.makeId ?? (() => randomUUID());

  const proposalOf = (plan: PlanRecord, label: string): NonNullable<NewAuditEntry["aiProposal"]> => ({
    proposalId: plan.id,
    title: `Plan ${plan.level} · ${label}`,
    steps: plan.steps,
    provider: plan.source.provider,
    version: `rev-${plan.revision}`,
  });

  async function onEvaluationSaved(evaluation: StoredEvaluation): Promise<PlanRecord | null> {
    if (evaluation.status !== "F2" && evaluation.status !== "F3") return null;
    if (await deps.plans.activeForSubject(evaluation.subjectId)) return null;

    const drafted = await deps.draft(evaluation);
    if (!drafted.ok || drafted.value.steps.length === 0) return null;

    const at = now();
    const { plan, duplicate } = await deps.plans.add({
      id: `pl-${makeId()}`,
      subjectId: evaluation.subjectId,
      evaluationId: evaluation.id,
      level: evaluation.status,
      status: "draft",
      revision: 1,
      steps: drafted.value.steps.slice(0, MAX_STEPS),
      uncertainty: drafted.value.uncertainty,
      source: drafted.value.source,
      concerns: deps.concernsFor?.(evaluation) ?? [],
      reviews: [],
      createdAt: at,
      updatedAt: at,
    });
    if (duplicate) return plan;

    const label = deps.labelFor(plan.subjectId);
    await deps.audit.append({
      action: "plan_drafted",
      actor: { kind: "system", id: "sentry" },
      subjectId: plan.subjectId,
      detail: "Borrador generado por Sentry; pendiente de revisión humana",
      aiProposal: proposalOf(plan, label),
      idempotencyKey: `plan-drafted:${plan.id}`,
    });
    await deps.notifications.add({
      dedupeKey: `plan-draft:${plan.id}`,
      kind: "plan",
      priority: plan.level === "F3" ? "high" : "normal",
      title: "Plan en borrador",
      body: `${label} · ${plan.level}: pendiente de revisión`,
      memberId: plan.subjectId,
      audience: [roleKey("cmo")],
      payload: { planId: plan.id, level: plan.level },
    });
    return plan;
  }

  async function submit(input: { planId: string; actor: Actor }): Promise<Result<PlanRecord>> {
    const at = now();
    const result = await deps.plans.update(input.planId, (plan) => submitForReview(plan, at));
    if (!result.ok) return result;
    const plan = result.value;
    const label = deps.labelFor(plan.subjectId);

    await deps.enqueue({
      idempotencyKey: requestKey(plan),
      kind: "plan_review_request",
      direction: "to_earth",
      payload: {
        planId: plan.id,
        subjectRef: plan.subjectId,
        memberLabel: label,
        level: plan.level,
        revision: plan.revision,
        steps: plan.steps,
        uncertainty: plan.uncertainty,
        provider: plan.source.provider,
        mode: plan.source.mode,
        issuedAt: at,
      },
    });
    await deps.audit.append({
      action: "plan_submitted",
      actor: { kind: "human", id: input.actor.actorId, role: input.actor.role },
      subjectId: plan.subjectId,
      detail: `Plan revisado a bordo y enviado a Tierra (revisión ${plan.revision})`,
      aiProposal: proposalOf(plan, label),
      idempotencyKey: `plan-submitted:${plan.id}:${plan.revision}`,
    });
    return result;
  }

  async function approveBoard(input: { planId: string; actor: Actor }): Promise<Result<PlanRecord>> {
    const link = await deps.linkStatus();
    const at = now();
    const result = await deps.plans.update(input.planId, (plan) => approveOnBoard(plan, input.actor, link, at));
    if (!result.ok) return result;
    const plan = result.value;
    await deps.audit.append({
      action: "plan_review",
      actor: { kind: "human", id: input.actor.actorId, role: input.actor.role },
      subjectId: plan.subjectId,
      detail: "Plan aprobado a bordo por falta de enlace con Tierra",
      aiProposal: proposalOf(plan, deps.labelFor(plan.subjectId)),
      humanDecision: { decision: "approve", note: "Sin enlace: decidió el médico de a bordo" },
      idempotencyKey: `plan-board-approve:${plan.id}`,
    });
    return result;
  }

  async function earthRespond(input: {
    planId: string;
    decision: EarthDecision;
    note: string;
    steps?: string[];
    reviewerId: string;
  }): Promise<Result<{ responseId: string }>> {
    const plan = await deps.plans.get(input.planId);
    if (!plan) return err("Plan no encontrado.");
    if (plan.status !== "in_review") return err("El plan ya no está en revisión.");
    const note = input.note.trim();
    if (input.decision !== "approve" && note.length < 3) return err("Escribe una nota para comentar o pedir cambios.");

    const responseId = makeId();
    await deps.enqueue({
      idempotencyKey: `plan-review-response:${responseId}`,
      kind: "plan_review_response",
      direction: "to_station",
      payload: {
        planId: plan.id,
        responseId,
        decision: input.decision,
        note,
        reviewerId: input.reviewerId,
        ...(input.steps ? { steps: input.steps } : {}),
        decidedAt: now(),
      },
    });
    return ok({ responseId });
  }

  async function reconcile(state: EarthState): Promise<number> {
    const delivered = deliveredKeys(state);
    let applied = 0;
    for (const packet of state.queue) {
      if (packet.kind !== "plan_review_response" || !delivered.has(packet.idempotencyKey)) continue;
      const planId = packet.payload.planId;
      const parsed = planReviewSchema.safeParse({
        responseId: packet.payload.responseId,
        decision: packet.payload.decision,
        note: packet.payload.note,
        reviewerId: packet.payload.reviewerId,
        at: packet.payload.decidedAt,
        ...(packet.payload.steps ? { steps: packet.payload.steps } : {}),
      });
      if (typeof planId !== "string" || !parsed.success) continue;
      const review: PlanReview = parsed.data;

      let didApply = false;
      const result = await deps.plans.update(planId, (plan) => {
        const outcome = applyEarthResponse(plan, review, now());
        didApply = outcome.applied;
        return ok(outcome.plan);
      });
      if (!result.ok || !didApply) continue;
      applied += 1;

      const plan = result.value;
      const label = deps.labelFor(plan.subjectId);
      if (review.decision !== "comment") {
        await deps.audit.append({
          action: "plan_review",
          actor: { kind: "human", id: review.reviewerId, role: "earth" },
          subjectId: plan.subjectId,
          detail: "Plan revisado por un médico de Tierra; respuesta confirmada por la cola",
          aiProposal: proposalOf(plan, label),
          humanDecision: {
            decision: review.decision === "approve" ? "approve" : review.steps ? "modify" : "reject",
            note: review.note,
            ...(review.steps ? { steps: review.steps } : {}),
          },
          idempotencyKey: `plan-review:${review.responseId}`,
        });
      }
      await deps.notifications.add({
        dedupeKey: `earth-response:${review.responseId}`,
        kind: "earth_response",
        priority: review.decision === "changes" ? "high" : "normal",
        title: "Tierra respondió",
        body: `${label}: ${VERB[review.decision]}`,
        memberId: plan.subjectId,
        audience: [roleKey("cmo"), roleKey("commander")],
        payload: { planId: plan.id, decision: review.decision },
      });
    }
    return applied;
  }

  async function awaitingEarth(state: EarthState): Promise<PlanRecord[]> {
    const delivered = deliveredKeys(state);
    const inReview = await deps.plans.list({ statuses: ["in_review"] });
    return inReview.filter((plan) => delivered.has(requestKey(plan)));
  }

  return { onEvaluationSaved, submit, approveBoard, earthRespond, reconcile, awaitingEarth };
}
