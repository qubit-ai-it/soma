"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { useLocalStore } from "@/features/pet/local-store";
import { Sentry } from "@/shared/ui/sentry";

import {
  ONBOARDING_DONE,
  ONBOARDING_KEY,
  ONBOARDING_OPEN_EVENT,
  ONBOARDING_STEPS,
  isLastStep,
  nextStepIndex,
  shouldShowOnboarding,
} from "../onboarding.logic";

const ACTION =
  "flex h-12 w-full items-center justify-center rounded-full px-6 font-heading text-base font-semibold outline-none transition-colors duration-[var(--duration-micro)] focus-visible:ring-2 focus-visible:ring-ring";

const parseStored = (value: unknown) => (typeof value === "string" ? value : "");
const subscribeNothing = () => () => {};

export function OnboardingGate() {
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const [stored, setStored] = useLocalStore<string>(ONBOARDING_KEY, "", parseStored);
  const [forced, setForced] = useState(false);
  const [closed, setClosed] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    function reopen() {
      setIndex(0);
      setForced(true);
    }
    window.addEventListener(ONBOARDING_OPEN_EVENT, reopen);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, reopen);
  }, []);

  const open = mounted && (forced || (shouldShowOnboarding(stored || null) && !closed));

  function finish() {
    setStored(ONBOARDING_DONE);
    setForced(false);
    setClosed(true);
    setIndex(0);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const step = ONBOARDING_STEPS[index];
  const last = isLastStep(index);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida a SOMA"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background p-6"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <Sentry
          mode={step.mode}
          successSignal={last ? 1 : 0}
          className="w-[min(60vw,15rem)]"
        />

        <div
          role="progressbar"
          aria-label="Progreso de la bienvenida"
          aria-valuemin={1}
          aria-valuemax={ONBOARDING_STEPS.length}
          aria-valuenow={index + 1}
          className="flex gap-2"
        >
          {ONBOARDING_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-2 w-8 rounded-full ${i <= index ? "bg-primary" : "bg-secondary"}`}
            />
          ))}
        </div>

        <div className="space-y-2" aria-live="polite">
          <h2 className="font-heading text-3xl font-bold leading-tight">{step.title}</h2>
          <p className="text-lg text-muted-foreground">{step.line}</p>
        </div>

        <div className="flex w-full flex-col gap-2">
          {last ? (
            <>
              <button
                type="button"
                onClick={finish}
                className={`${ACTION} bg-primary text-primary-foreground hover:bg-primary/85`}
              >
                Empezar
              </button>
              <Link
                href="/demo"
                onClick={finish}
                className={`${ACTION} bg-secondary text-foreground hover:bg-secondary/70`}
              >
                Ver la demo
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIndex(nextStepIndex(index))}
                className={`${ACTION} bg-primary text-primary-foreground hover:bg-primary/85`}
              >
                Siguiente
              </button>
              <button
                type="button"
                onClick={finish}
                className={`${ACTION} bg-secondary text-foreground hover:bg-secondary/70`}
              >
                Saltar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
