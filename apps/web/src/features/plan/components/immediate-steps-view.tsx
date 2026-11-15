import { SomaCard } from "@/shared/ui/soma-card";

import { APPROVED_CHIP, IMMEDIATE_STEPS_TITLE } from "../plan.display";
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
    <section aria-label={IMMEDIATE_STEPS_TITLE} className="space-y-4">
      <h2 className="font-heading text-2xl font-bold">{IMMEDIATE_STEPS_TITLE}</h2>

      {steps.length === 0 ? (
        <p className="text-base text-muted-foreground">Sin desviación: no hay pasos pre-aprobados.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groupByProtocol(steps).map((group) => {
            const { approval, matchedBy } = group.steps[0];
            return (
              <SomaCard
                key={group.protocolId}
                title={group.title}
                line={group.steps[0].text}
                chip={APPROVED_CHIP}
                tone="ok"
                detailLabel="Ver pasos"
                detail={
                  <>
                    <ol className="list-decimal space-y-1 pl-5">
                      {group.steps.map((step) => (
                        <li key={step.stepId}>{step.text}</li>
                      ))}
                    </ol>
                    <p>
                      {approval.approvedBy} · versión {approval.version} · {approval.approvedAt.slice(0, 10)}
                    </p>
                    <p>Seleccionado por: {matchedBy.join(", ")}</p>
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
