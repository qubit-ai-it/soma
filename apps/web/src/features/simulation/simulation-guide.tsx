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
    title: "Conoce a la tripulación",
    text: "Cada número en el mapa es una persona. Haz clic para ver sus lecturas.",
  },
  {
    title: "Ayuda cuando haya peligro",
    text: "Si alguien se pone rojo, no lo muevas. Lleva a los dos compañeros siguiendo sus chats; después podrás cambiar sus lecturas.",
  },
  {
    title: "Termina o vuelve a empezar",
    text: "Actualiza las lecturas cuando mejoren. Reiniciar situación borra el ejercicio y cambia los lugares de la tripulación.",
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
        Cómo funciona
      </Button>
      <Dialog.Root open={open} onOpenChange={(next) => { if (!next) close(); }}>
        <Dialog.Portal>
          <Dialog.Backdrop className={styles.guideBackdrop} />
          <Dialog.Popup className={styles.guidePopup}>
            <span className={styles.guideCount}>Paso {step + 1} de {steps.length}</span>
            <Dialog.Title className={styles.guideTitle}>{steps[step].title}</Dialog.Title>
            <Dialog.Description className={styles.guideText}>{steps[step].text}</Dialog.Description>
            <div className={styles.guideProgress} aria-hidden="true">
              {steps.map((item, index) => <span key={item.title} data-active={index === step} />)}
            </div>
            <div className={styles.guideActions}>
              <Button type="button" variant="outline" size="sm" onClick={close}>Saltar</Button>
              {step > 0 && <Button type="button" variant="outline" size="sm" onClick={() => setStep(step - 1)}>Atrás</Button>}
              <Button type="button" size="sm" onClick={() => step === steps.length - 1 ? close() : setStep(step + 1)}>
                {step === steps.length - 1 ? "Empezar" : "Siguiente"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
