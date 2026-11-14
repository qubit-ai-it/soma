import { describePlanSource, PLAN_DISCLAIMER } from "../plan.display";
import type { CarePlanDTO } from "../plan.types";

export function CarePlanView({ plan }: { plan: CarePlanDTO }) {
  const source = describePlanSource(plan);
  return (
    <article
      aria-label="Borrador de plan"
      className="rounded-md bg-card p-5 text-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-signal">
          {PLAN_DISCLAIMER}
        </span>
        {source.badge && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
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
      <p className="mt-1 text-xs text-ink">
        Fuente: {source.detail}. No es un diagnóstico ni orientación médica.
      </p>
    </article>
  );
}
