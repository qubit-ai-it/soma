import { err, ok, type Result } from "../../shared/result.ts";
import type { Role } from "../roles/roles.types.ts";
import { ACTIVE_STATUSES, type PlanRecord, type PlanReview } from "./plan.record.ts";

export function submitForReview(plan: PlanRecord, now: string): Result<PlanRecord> {
  if (plan.status !== "draft" && plan.status !== "changes_requested") {
    return err("The plan is already in review or decided.");
  }
  return ok({
    ...plan,
    status: "in_review",
    revision: plan.status === "changes_requested" ? plan.revision + 1 : plan.revision,
    updatedAt: now,
  });
}

export function approveOnBoard(
  plan: PlanRecord,
  actor: { role: Role; actorId: string },
  link: "connected" | "disconnected",
  now: string,
): Result<PlanRecord> {
  if (link === "connected") return err("With a link, the decision belongs to Earth.");
  if (!ACTIVE_STATUSES.includes(plan.status)) return err("The plan is already decided.");
  return ok({
    ...plan,
    status: "approved",
    decided: { via: "board", role: actor.role, actorId: actor.actorId, at: now },
    updatedAt: now,
  });
}

export function applyEarthResponse(
  plan: PlanRecord,
  review: PlanReview,
  now: string,
): { plan: PlanRecord; applied: boolean } {
  if (plan.reviews.some((r) => r.responseId === review.responseId)) return { plan, applied: false };

  const next: PlanRecord = { ...plan, reviews: [...plan.reviews, review], updatedAt: now };
  if (plan.status !== "in_review") return { plan: next, applied: true };

  if (review.decision === "approve") {
    return {
      plan: {
        ...next,
        status: "approved",
        decided: { via: "earth", role: "earth", actorId: review.reviewerId, at: review.at },
      },
      applied: true,
    };
  }
  if (review.decision === "changes") {
    return {
      plan: { ...next, status: "changes_requested", steps: review.steps ?? plan.steps },
      applied: true,
    };
  }
  return { plan: next, applied: true };
}
