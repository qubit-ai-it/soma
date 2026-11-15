"use client";

import { useActionState } from "react";

import { PROPOSED_DRAFT_TITLE } from "../plan.display";
import { IDLE_PLAN_STATE, type PlanActionState } from "../plan.types";
import { CarePlanView } from "./care-plan-view";

type Props = {
  action: (previous: PlanActionState) => Promise<PlanActionState>;
};

export function CarePlanGenerator({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, IDLE_PLAN_STATE);

  return (
    <section aria-label={PROPOSED_DRAFT_TITLE} className="space-y-3">
      <h2 className="font-heading text-lg font-bold">{PROPOSED_DRAFT_TITLE}</h2>
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-5 py-2 font-heading text-sm font-semibold text-primary-foreground transition-colors duration-[var(--duration-micro)] ease-[var(--ease-editorial)] hover:bg-primary/85 disabled:opacity-60"
        >
          {pending ? "Generando…" : "Generar borrador"}
        </button>
        <span className="text-xs text-ink">
          El borrador no se guarda: se pierde al recargar.
        </span>
      </form>

      <div aria-live="polite">
        {state.status === "idle" && !pending && (
          <p className="text-sm text-ink">Aún no hay borrador.</p>
        )}
        {state.status === "error" && (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        )}
        {state.status === "ready" && <CarePlanView plan={state.plan} />}
      </div>
    </section>
  );
}
