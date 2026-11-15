"use client";

import { useEffect, useState, useTransition } from "react";

import { SomaCard, type CardAction } from "@/shared/ui/soma-card";

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
  const last = index === steps.length - 1;

  const actions: CardAction[] = [{ label: "Abrir pantalla", icon: "open_in_new", href: step.href, newTab: true }];
  if (step.id === "safety-gate") {
    actions.push({
      label: pending ? "Generando alerta…" : "Disparar alerta F3",
      icon: "emergency",
      variant: "secondary",
      disabled: pending,
      onClick: () =>
        startTransition(async () => {
          const result = await raiseF3();
          setAlertMessage(result.message);
        }),
    });
  }
  actions.push(
    last
      ? { label: "Reiniciar", icon: "restart_alt", variant: "secondary", onClick: () => go(0) }
      : { label: "Siguiente", icon: "arrow_forward", variant: "secondary", onClick: () => go(nextIndex(index, steps.length)) },
  );

  return (
    <section aria-label="Controlador de la demo" className="space-y-4">
      <p className="text-sm text-ink">
        Paso {index + 1} de {steps.length}
      </p>

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
            className={`h-2 flex-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring ${i <= index ? "bg-primary" : "bg-secondary"}`}
          />
        ))}
      </div>

      <SomaCard
        key={step.id}
        title={step.title}
        line={step.say}
        chip={`${format(elapsed)} / ${format(step.durationSec)}`}
        tone={elapsed > step.durationSec ? "warn" : "info"}
        label={`Paso ${index + 1}: ${step.title}`}
        className="p-6"
        actions={actions}
        detail={
          <dl className="space-y-3">
            <div>
              <dt className="font-semibold">En pantalla</dt>
              <dd>{step.onScreen}</dd>
            </div>
            <div>
              <dt className="font-semibold">Principio</dt>
              <dd>{step.principle}</dd>
            </div>
            <div>
              <dt className="font-semibold">Tiempo</dt>
              <dd>
                Guion previsto {format(planned)} de {format(totalSeconds(steps))}
              </dd>
            </div>
          </dl>
        }
      >
        {alertMessage && (
          <p role="status" className="text-sm">
            {alertMessage}
          </p>
        )}
      </SomaCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(prevIndex(index))}
          disabled={index === 0}
          className="rounded-full bg-card px-5 py-2 font-heading text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          Anterior
        </button>
        <p className="text-xs text-ink">Atajos: → o espacio avanza, ← retrocede, R reinicia.</p>
      </div>
    </section>
  );
}
