"use client";

import { startTransition, useActionState } from "react";

import { SomaCard } from "@/shared/ui/soma-card";

import { PLAN_DISCLAIMER, PROPOSED_DRAFT_TITLE } from "../plan.display";
import { IDLE_PLAN_STATE, type PlanActionState } from "../plan.types";
import { CarePlanDetail } from "./care-plan-view";

type Props = {
  action: (previous: PlanActionState) => Promise<PlanActionState>;
};

export function CarePlanGenerator({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, IDLE_PLAN_STATE);

  const line =
    state.status === "ready"
      ? (state.plan.steps[0] ?? "")
      : state.status === "idle" && !pending
        ? "Aún no hay borrador. No se guarda al recargar."
        : undefined;

  return (
    <section aria-label={PROPOSED_DRAFT_TITLE} className="space-y-4">
      <h2 className="font-heading text-2xl font-bold">{PROPOSED_DRAFT_TITLE}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
        <SomaCard
          title="Plan generado por IA"
          label="Borrador de plan"
          line={line}
          chip={PLAN_DISCLAIMER}
          tone="info"
          detail={state.status === "ready" ? <CarePlanDetail plan={state.plan} /> : undefined}
          actions={[
            {
              label: pending ? "Generando…" : state.status === "ready" ? "Generar de nuevo" : "Generar borrador",
              icon: "auto_awesome",
              disabled: pending,
              onClick: () => startTransition(() => formAction()),
            },
          ]}
        >
          {state.status === "error" && (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          )}
        </SomaCard>
      </div>
    </section>
  );
}
