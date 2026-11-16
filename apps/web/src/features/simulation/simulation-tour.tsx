"use client";

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";

import { ONBOARDING_DONE, ONBOARDING_KEY } from "@/features/onboarding/onboarding.logic";
import { useUserScope } from "@/features/roles/roles.store";
import { scopedKey } from "@/features/settings/scope.logic";
import { useLocalStore } from "@/shared/local-store";
import { Button } from "@/shared/ui/button";

import { TOUR_KEY, TOUR_STEPS, advanceWhileDone, placeCard, type Box, type TourContext } from "./tour.logic";

const parseBoolean = (value: unknown) => value === true;
const parseString = (value: unknown) => (typeof value === "string" ? value : "");
const subscribeNothing = () => () => {};

const CARD_WIDTH = 352;
const CARD_HEIGHT = 200;
const PADDING = 6;

function sameBox(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

export function SimulationTour({ context, ready }: { context: TourContext; ready: boolean }) {
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const scope = useUserScope();
  const [seen, setSeen] = useLocalStore(scopedKey(TOUR_KEY, scope), false, parseBoolean);
  const [onboarding] = useLocalStore(ONBOARDING_KEY, "", parseString);
  const [manualOpen, setManualOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const open = ready && mounted && onboarding === ONBOARDING_DONE && (!seen || manualOpen);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;

  function close() {
    setSeen(true);
    setManualOpen(false);
    setIndex(0);
  }

  useEffect(() => {
    if (!open) return;
    const next = advanceWhileDone(index, context);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follow the user's actions in the simulation
    if (next !== index) setIndex(next);
  }, [open, index, context]);

  useEffect(() => {
    if (!open) return;
    const selector = `[data-tour="${step.target}"]`;
    document.querySelector(selector)?.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      const next = rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null;
      setBox((current) => (sameBox(current, next) ? current : next));
    };
    measure();
    const timer = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step.target]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const viewport = typeof window === "undefined" ? { width: 1024, height: 768 } : { width: window.innerWidth, height: window.innerHeight };
  const cardWidth = Math.min(CARD_WIDTH, viewport.width * 0.92);
  const place = placeCard(box, viewport, { width: cardWidth, height: CARD_HEIGHT });
  const spotlight: CSSProperties = box
    ? {
        top: box.top - PADDING,
        left: box.left - PADDING,
        width: box.width + PADDING * 2,
        height: box.height + PADDING * 2,
        borderRadius: 16,
        boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.62)",
      }
    : { inset: 0, background: "rgb(0 0 0 / 0.62)" };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setIndex(0);
          setManualOpen(true);
        }}
      >
        How it works
      </Button>
      {open && (
        <>
          <div aria-hidden="true" className="pointer-events-none fixed z-[70] transition-all duration-200" style={spotlight} />
          <section
            role="dialog"
            aria-label="Guided tour"
            aria-live="polite"
            className="fixed z-[71] grid gap-3 rounded-3xl bg-card p-5 text-foreground shadow-2xl"
            style={{ top: place.top, left: place.left, width: cardWidth }}
          >
            <span className="text-xs text-ink">
              Step {index + 1} of {TOUR_STEPS.length}
            </span>
            <h2 className="font-heading text-xl font-bold">{step.title}</h2>
            <p className="text-base text-muted-foreground">{step.text(context)}</p>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="sm" onClick={close}>
                Skip
              </Button>
              <div className="flex gap-2">
                {index > 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setIndex(index - 1)}>
                    Back
                  </Button>
                )}
                <Button type="button" size="sm" onClick={() => (last ? close() : setIndex(index + 1))}>
                  {last ? "Done" : "Next"}
                </Button>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
