import { describePlanSource, PLAN_DISCLAIMER } from "../plan.display";
import type { CarePlanDTO } from "../plan.types";

export function CarePlanView({ plan }: { plan: CarePlanDTO }) {
  const source = describePlanSource(plan);
  return (
    <article
      aria-label="Borrador de plan"
      className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-200">
          {PLAN_DISCLAIMER}
        </span>
        {source.badge && (
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            {source.badge}
          </span>
        )}
      </div>

      <ol className="mt-3 list-decimal space-y-1 pl-5">
        {plan.steps.map((step, index) => (
          <li key={index} className="whitespace-pre-wrap">
            {step}
          </li>
        ))}
      </ol>

      <p className="mt-3 whitespace-pre-wrap">
        <span className="font-medium">Incertidumbre:</span> {plan.uncertainty}
      </p>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        Fuente: {source.detail}. No es un diagnóstico ni orientación médica.
      </p>
    </article>
  );
}
