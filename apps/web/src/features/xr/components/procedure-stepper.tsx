"use client";

import type { Procedure, SessionState } from "../procedure.types";
import type { SessionAction } from "../session.flow";
import { statusLabel } from "../xr.display";

type Props = {
  procedure: Procedure;
  session: SessionState;
  onAction: (action: SessionAction) => void;
};

const BUTTON =
  "min-h-16 rounded-full px-8 font-heading text-xl font-semibold transition-colors duration-[var(--duration-micro)] ease-[var(--ease-editorial)] disabled:opacity-40";

export function ProcedureStepper({ procedure, session, onAction }: Props) {
  const step = procedure.steps[session.currentIndex];
  const inProgress = session.phase === "in-progress";
  const total = procedure.steps.length;

  return (
    <section aria-label="Procedimiento" className="space-y-6">
      <ol className="space-y-2">
        {procedure.steps.map((item, index) => {
          const current = inProgress && index === session.currentIndex;
          return (
            <li
              key={item.id}
              aria-current={current ? "step" : undefined}
              className={`flex items-center justify-between gap-4 rounded-lg px-5 py-4 text-lg ${
                current ? "bg-primary text-primary-foreground" : "bg-card"
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

      {session.phase === "completed" && (
        <p role="status" className="rounded-lg bg-ok/15 p-5 text-xl">
          Procedimiento terminado. El resultado queda como observación con su calidad.
        </p>
      )}
      {session.phase === "aborted" && (
        <p role="status" className="rounded-lg bg-warn/15 p-5 text-xl">
          Sesión abortada. No se registró ningún resultado.
        </p>
      )}

      {inProgress && (
        <div className="space-y-3 rounded-lg bg-card p-6">
          <h2 className="text-2xl">
            Paso {session.currentIndex + 1} de {total}: {step.title}
          </h2>
          <p className="text-xl leading-relaxed">{step.instruction}</p>
          {step.safetyNote && (
            <p className="rounded-lg bg-warn/15 p-4 text-lg">Seguridad: {step.safetyNote}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {inProgress && (
          <>
            <button type="button" className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/85`} onClick={() => onAction({ type: "complete" })}>
              Completar paso
            </button>
            <button type="button" className={`${BUTTON} bg-secondary hover:bg-secondary/70`} disabled={!step.optional} onClick={() => onAction({ type: "skip" })}>
              Omitir
            </button>
            <button type="button" className={`${BUTTON} bg-danger/20 hover:bg-danger/30`} onClick={() => onAction({ type: "fail" })}>
              Marcar fallido
            </button>
          </>
        )}
        {session.phase !== "aborted" && (
          <button type="button" className={`${BUTTON} bg-secondary hover:bg-secondary/70`} disabled={session.phase === "in-progress" && session.currentIndex === 0} onClick={() => onAction({ type: "back" })}>
            Volver
          </button>
        )}
        {session.mode === "practice" && (
          <button type="button" className={`${BUTTON} bg-secondary hover:bg-secondary/70`} onClick={() => onAction({ type: "reset" })}>
            Reiniciar práctica
          </button>
        )}
        {inProgress && (
          <button type="button" className={`${BUTTON} bg-secondary hover:bg-secondary/70`} onClick={() => onAction({ type: "abort" })}>
            Abortar
          </button>
        )}
      </div>
    </section>
  );
}
