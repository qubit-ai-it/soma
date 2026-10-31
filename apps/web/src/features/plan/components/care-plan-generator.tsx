"use client";

import { useActionState } from "react";

import { IDLE_PLAN_STATE, type PlanActionState } from "../plan.types";
import { CarePlanView } from "./care-plan-view";

type Props = {
  action: (previous: PlanActionState) => Promise<PlanActionState>;
};

export function CarePlanGenerator({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, IDLE_PLAN_STATE);

  return (
    <section aria-label="Plan o tratamiento" className="space-y-3">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {pending ? "Generando…" : "Generar borrador"}
        </button>
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          El borrador no se guarda: se pierde al recargar.
        </span>
      </form>

      <div aria-live="polite">
        {state.status === "idle" && !pending && (
          <p className="text-sm text-zinc-500">Aún no hay borrador.</p>
        )}
        {state.status === "error" && (
          <p role="alert" className="text-sm text-violet-800 dark:text-violet-300">
            {state.message}
          </p>
        )}
        {state.status === "ready" && <CarePlanView plan={state.plan} />}
      </div>
    </section>
  );
}
