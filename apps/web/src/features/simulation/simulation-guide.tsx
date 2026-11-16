"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState, useSyncExternalStore } from "react";
import { ONBOARDING_DONE, ONBOARDING_KEY } from "@/features/onboarding/onboarding.logic";
import { useLocalStore } from "@/shared/local-store";
import { Button } from "@/shared/ui/button";
import styles from "./simulation.module.css";

const GUIDE_KEY = "soma.simulation-guide.v1";
const steps = [
  {
    title: "Meet the crew",
    text: "Each number on the map is a person. Click to see their readings.",
  },
  {
    title: "Help when there is danger",
    text: "If someone turns red, do not move them. Move the two teammates by following their chats; then you can change their readings.",
  },
  {
    title: "Finish or start over",
    text: "Update the readings when they improve. Restart situation clears the exercise and shuffles the crew locations.",
  },
] as const;

const parseBoolean = (value: unknown) => value === true;
const parseString = (value: unknown) => typeof value === "string" ? value : "";
const subscribeNothing = () => () => {};

export function SimulationGuide() {
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [seen, setSeen] = useLocalStore(GUIDE_KEY, false, parseBoolean);
  const [onboarding] = useLocalStore(ONBOARDING_KEY, "", parseString);
  const [manualOpen, setManualOpen] = useState(false);
  const [step, setStep] = useState(0);
  const open = mounted && onboarding === ONBOARDING_DONE && (!seen || manualOpen);

  function close() {
    setSeen(true);
    setManualOpen(false);
    setStep(0);
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => { setStep(0); setManualOpen(true); }}>
        How it works
      </Button>
      <Dialog.Root open={open} onOpenChange={(next) => { if (!next) close(); }}>
        <Dialog.Portal>
          <Dialog.Backdrop className={styles.guideBackdrop} />
          <Dialog.Popup className={styles.guidePopup}>
            <span className={styles.guideCount}>Step {step + 1} of {steps.length}</span>
            <Dialog.Title className={styles.guideTitle}>{steps[step].title}</Dialog.Title>
            <Dialog.Description className={styles.guideText}>{steps[step].text}</Dialog.Description>
            <div className={styles.guideProgress} aria-hidden="true">
              {steps.map((item, index) => <span key={item.title} data-active={index === step} />)}
            </div>
            <div className={styles.guideActions}>
              <Button type="button" variant="outline" size="sm" onClick={close}>Skip</Button>
              {step > 0 && <Button type="button" variant="outline" size="sm" onClick={() => setStep(step - 1)}>Back</Button>}
              <Button type="button" size="sm" onClick={() => step === steps.length - 1 ? close() : setStep(step + 1)}>
                {step === steps.length - 1 ? "Start" : "Next"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
