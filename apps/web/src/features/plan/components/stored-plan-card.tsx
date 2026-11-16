"use client";

import { submitPlanAction, approvePlanOnBoardAction } from "@/app/report/[id]/plan/actions";
import { useCallerAction } from "@/features/roles/use-caller-action";
import { SomaCard, type CardAction } from "@/shared/ui/soma-card";

import type { PlanRecord } from "../plan.record";
import { boardActions, DECISION_LABEL, MODE_LABEL, PLAN_STATUS_LABEL, PLAN_STATUS_TONE } from "../plan.status";

type Props = {
  plan: PlanRecord;
  link: "connected" | "disconnected";
  generated: string;
};

export function StoredPlanCard({ plan, link, generated }: Props) {
  const { run, pending, error, role } = useCallerAction();
  const allowed = boardActions(plan.status, link);

  const actions: CardAction[] =
    role === "cmo"
      ? [
          ...(allowed.submit
            ? [
                {
                  label: plan.status === "changes_requested" ? "Resend to Earth" : "Send to Earth",
                  icon: "send",
                  disabled: pending,
                  onClick: () => run((caller) => submitPlanAction({ ...caller, planId: plan.id })),
                },
              ]
            : []),
          ...(allowed.approve
            ? [
                {
                  label: "Approve onboard",
                  icon: "check",
                  variant: "secondary" as const,
                  disabled: pending,
                  onClick: () => run((caller) => approvePlanOnBoardAction({ ...caller, planId: plan.id })),
                },
              ]
            : []),
        ]
      : [];

  return (
    <SomaCard
      title={`Plan ${plan.level}`}
      line={role === "cmo" ? (allowed.note ?? undefined) : undefined}
      chip={PLAN_STATUS_LABEL[plan.status]}
      tone={PLAN_STATUS_TONE[plan.status]}
      actions={actions}
      footer={`${generated} · ${plan.source.provider} (${MODE_LABEL[plan.source.mode]}) · rev. ${plan.revision}`}
      detailLabel="View steps"
      detail={
        <>
          <ol className="list-decimal space-y-1 pl-5">
            {plan.steps.map((step, index) => (
              <li key={index} className="whitespace-pre-wrap">
                {step}
              </li>
            ))}
          </ol>
          <p className="whitespace-pre-wrap">{plan.uncertainty}</p>
          {plan.reviews.map((review) => (
            <p key={review.responseId} className="rounded-md bg-secondary p-3">
              <span className="font-semibold">{DECISION_LABEL[review.decision]}</span>
              {review.note ? ` · ${review.note}` : ""}
            </p>
          ))}
          {plan.decided && (
            <p className="text-xs">
              {plan.decided.via === "earth" ? "Decided by Earth" : "Decided onboard"} · {plan.decided.actorId}
            </p>
          )}
        </>
      }
    >
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </SomaCard>
  );
}
