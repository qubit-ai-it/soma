"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { keyToAction, nextIndex, prevIndex, totalSeconds } from "../demo.logic";
import type { DemoStep } from "../demo.script";

type Props = {
  steps: readonly DemoStep[];
  raiseF3: () => Promise<{ ok: boolean; message: string }>;
};

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function DemoConductor({ steps, raiseF3 }: Props) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const step = steps[index];

  function go(next: number) {
    setIndex(next);
    setElapsed(0);
    setAlertMessage(null);
  }

  useEffect(() => {
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [index]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const action = keyToAction(event.key);
      if (action === null) return;
      event.preventDefault();
      setIndex((current) =>
        action === "next"
          ? nextIndex(current, steps.length)
          : action === "prev"
            ? prevIndex(current)
            : 0,
      );
      setElapsed(0);
      setAlertMessage(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps.length]);

  const planned = steps.slice(0, index).reduce((sum, s) => sum + s.durationSec, 0);

  return (
    <section aria-label="Controlador de la demo" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink">
        <span>
          Paso {index + 1} de {steps.length}
        </span>
        <span>
          Tiempo del paso {format(elapsed)} / {format(step.durationSec)} · Guion previsto{" "}
          {format(planned)} de {format(totalSeconds(steps))}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={index + 1}
        aria-label="Progreso de la demo"
        className="flex gap-1"
      >
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(i)}
            aria-label={`Ir al paso ${i + 1}: ${s.title}`}
            aria-current={i === index ? "step" : undefined}
            className={`h-2 flex-1 rounded-full ${i <= index ? "bg-primary" : "bg-secondary"}`}
          />
        ))}
      </div>

      <article className="space-y-4 rounded-2xl bg-card p-6">
        <h2 className="font-heading text-2xl font-bold">{step.title}</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-semibold">En pantalla</dt>
            <dd>{step.onScreen}</dd>
          </div>
          <div>
            <dt className="font-semibold">Qué decir</dt>
            <dd>{step.say}</dd>
          </div>
          <div>
            <dt className="font-semibold">Principio</dt>
            <dd>{step.principle}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={step.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-primary px-5 py-2 font-heading text-sm font-semibold text-primary-foreground"
          >
            Abrir pantalla ({step.href})
          </Link>
          {step.id === "safety-gate" && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await raiseF3();
                  setAlertMessage(result.message);
                })
              }
              className="rounded-full bg-secondary px-5 py-2 font-heading text-sm font-semibold disabled:opacity-60"
            >
              {pending ? "Generando alerta…" : "Disparar alerta F3 (demostración)"}
            </button>
          )}
        </div>
        {alertMessage && (
          <p role="status" className="text-sm">
            {alertMessage}
          </p>
        )}
      </article>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => go(prevIndex(index))}
          disabled={index === 0}
          className="rounded-full bg-card px-5 py-2 font-heading text-sm font-semibold disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => go(nextIndex(index, steps.length))}
          disabled={index === steps.length - 1}
          className="rounded-full bg-primary px-5 py-2 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Siguiente
        </button>
        <button
          type="button"
          onClick={() => go(0)}
          className="rounded-full bg-card px-5 py-2 font-heading text-sm font-semibold"
        >
          Reiniciar
        </button>
      </div>
      <p className="text-xs text-ink">Atajos: flecha derecha o espacio avanza, flecha izquierda retrocede, R reinicia.</p>
    </section>
  );
}
