import { IMMEDIATE_STEPS_TITLE } from "../plan.display";
import type { ImmediateStep } from "../plan.types";

type Group = { protocolId: string; title: string; steps: ImmediateStep[] };

function groupByProtocol(steps: ImmediateStep[]): Group[] {
  const groups: Group[] = [];
  for (const step of steps) {
    const group = groups.find((g) => g.protocolId === step.protocolId);
    if (group) group.steps.push(step);
    else groups.push({ protocolId: step.protocolId, title: step.protocolTitle, steps: [step] });
  }
  return groups;
}

export function ImmediateStepsView({ steps }: { steps: ImmediateStep[] }) {
  return (
    <section aria-label={IMMEDIATE_STEPS_TITLE} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-heading text-lg font-bold">{IMMEDIATE_STEPS_TITLE}</h2>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-signal">
          Aprobados antes de la misión · se pueden iniciar ahora
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
          Contenido de demostración
        </span>
      </div>

      {steps.length === 0 ? (
        <p className="text-sm text-ink">
          Sin desviación evaluable, no hay pasos pre-aprobados para este tripulante.
        </p>
      ) : (
        groupByProtocol(steps).map((group) => {
          const { approval, matchedBy } = group.steps[0];
          return (
            <article
              key={group.protocolId}
              aria-label={group.title}
              className="rounded-md bg-card p-5 text-sm"
            >
              <h3 className="font-heading font-semibold">{group.title}</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {group.steps.map((step) => (
                  <li key={step.stepId}>{step.text}</li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-ink">
                Aprobado por {approval.approvedBy} · versión {approval.version} ·{" "}
                {approval.approvedAt.slice(0, 10)}. Origen: {approval.source}.
              </p>
              <p className="mt-1 text-xs text-ink">Seleccionado por: {matchedBy.join(", ")}</p>
            </article>
          );
        })
      )}
    </section>
  );
}
