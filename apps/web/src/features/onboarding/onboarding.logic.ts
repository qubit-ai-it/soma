import type { SentryMode } from "../pet/pet.types.ts";

export const ONBOARDING_KEY = "soma.onboarding.v1";
export const ONBOARDING_DONE = "done";
export const ONBOARDING_OPEN_EVENT = "soma:onboarding";

export type OnboardingStep = {
  id: string;
  mode: SentryMode;
  title: string;
  line: string;
};

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "hello",
    mode: "idle",
    title: "Soy Sentry",
    line: "Acompaño a la tripulación y vigilo cambios en su salud.",
  },
  {
    id: "baseline",
    mode: "thinking",
    title: "Cada persona es su referencia",
    line: "Comparo a cada astronauta con su propia historia.",
  },
  {
    id: "rules",
    mode: "working",
    title: "Las reglas deciden",
    line: "Yo explico. La decisión siempre es de una persona.",
  },
  {
    id: "alerts",
    mode: "warning",
    title: "Si algo cambia, aviso",
    line: "Alertas cortas, solo con lo que importa.",
  },
  {
    id: "offline",
    mode: "idle",
    title: "También sin conexión",
    line: "Todo sigue funcionando aunque Tierra no responda.",
  },
];

export function shouldShowOnboarding(stored: string | null): boolean {
  return stored !== ONBOARDING_DONE;
}

export function nextStepIndex(index: number): number {
  return Math.min(index + 1, ONBOARDING_STEPS.length - 1);
}

export function isLastStep(index: number): boolean {
  return index >= ONBOARDING_STEPS.length - 1;
}
