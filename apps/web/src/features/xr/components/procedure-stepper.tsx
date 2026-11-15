"use client";

import { SomaCard } from "@/shared/ui/soma-card";

import type { Procedure, SessionState } from "../procedure.types";
import type { SessionAction } from "../session.flow";
import { statusLabel } from "../xr.display";

type Props = {
  procedure: Procedure;
  session: SessionState;
  onAction: (action: SessionAction) => void;
};

const MAIN =
  "flex h-16 w-full items-center justify-center rounded-full px-6 font-heading text-xl font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";
const SMALL =
  "flex h-11 items-center justify-center rounded-full bg-secondary px-5 font-heading text-sm font-semibold outline-none transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

export function ProcedureStepper({ procedure, session, onAction }: Props) {
  const step = procedure.steps[session.currentIndex];
  const inProgress = session.phase === "in-progress";
  const total = procedure.steps.length;
  const atFirst = inProgress && session.currentIndex === 0;

  const steps = (
    <ol className="space-y-1">
      {procedure.steps.map((item, index) => {
        const current = inProgress && index === session.currentIndex;
        return (
          <li
            key={item.id}
            aria-current={current ? "step" : undefined}
            className={`flex items-center justify-between gap-3 rounded-full px-4 py-2 ${
              current ? "bg-primary text-primary-foreground" : "bg-secondary"
            }`}
          >
            <span>
              {index + 1}. {item.title}
              {item.optional && " (opcional)"}
            </span>
            <span className="font-semibold">{current ? "Actual" : statusLabel(session.statuses[index])}</span>
          </li>
        );
      })}
    </ol>
  );

  if (!inProgress) {
    const done = session.phase === "completed";
    return (
      <section aria-label="Procedimiento">
        <SomaCard
          title={done ? "Procedimiento terminado" : "Sesión abortada"}
          line={done ? "Queda como observación con su calidad." : "No se registró ningún resultado."}
          chip={done ? "Listo" : "Abortada"}
          tone={done ? "ok" : "warn"}
          detail={steps}
          detailLabel="Ver pasos"
        >
          <div role="status" className="sr-only">
            {done ? "Procedimiento terminado" : "Sesión abortada"}
          </div>
          <div className="flex flex-wrap gap-2">
            {!done ? null : (
              <button type="button" className={SMALL} onClick={() => onAction({ type: "back" })}>
                Volver
              </button>
            )}
            {session.mode === "practice" && (
              <button type="button" className={SMALL} onClick={() => onAction({ type: "reset" })}>
                Reiniciar
              </button>
            )}
          </div>
        </SomaCard>
      </section>
    );
  }

  return (
    <section aria-label="Procedimiento">
      <SomaCard
        title={`Paso ${session.currentIndex + 1} de ${total} · ${step.title}`}
        line={step.instruction}
        chip={step.optional ? "Opcional" : undefined}
        tone="info"
        detail={steps}
        detailLabel="Ver pasos"
      >
        {step.safetyNote && (
          <p className="rounded-2xl bg-warn/15 px-4 py-2 text-sm text-warn">Seguridad: {step.safetyNote}</p>
        )}
        <div className="flex flex-col gap-2">
          <button type="button" className={`${MAIN} bg-primary text-primary-foreground hover:bg-primary/85`} onClick={() => onAction({ type: "complete" })}>
            Hecho
          </button>
          <button type="button" className={`${MAIN} bg-secondary hover:bg-secondary/70`} onClick={() => onAction({ type: "fail" })}>
            No puedo
          </button>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer list-none text-ink outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            Más opciones
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {step.optional && (
              <button type="button" className={SMALL} onClick={() => onAction({ type: "skip" })}>
                Omitir
              </button>
            )}
            <button type="button" className={SMALL} disabled={atFirst} onClick={() => onAction({ type: "back" })}>
              Volver
            </button>
            {session.mode === "practice" && (
              <button type="button" className={SMALL} onClick={() => onAction({ type: "reset" })}>
                Reiniciar
              </button>
            )}
            <button type="button" className={SMALL} onClick={() => onAction({ type: "abort" })}>
              Abortar
            </button>
          </div>
        </details>
      </SomaCard>
    </section>
  );
}
