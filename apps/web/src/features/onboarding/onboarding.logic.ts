import type { SentryMode } from "../../shared/sentry.types.ts";

export const ONBOARDING_KEY = "soma.onboarding.v1";
export const ONBOARDING_DONE = "done";

export const SETUP_KINDS = ["color", "role", "source", "xr"] as const;
export type SetupKind = (typeof SETUP_KINDS)[number];

export type OnboardingStep = {
  id: string;
  kind: "info" | SetupKind;
  mode: SentryMode;
  title: string;
  line: string;
};

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "hello",
    kind: "info",
    mode: "idle",
    title: "Soy Sentry",
    line: "Acompaño a la tripulación y vigilo cambios en su salud.",
  },
  {
    id: "baseline",
    kind: "info",
    mode: "thinking",
    title: "Cada persona es su referencia",
    line: "Comparo a cada astronauta con su propia historia.",
  },
  {
    id: "rules",
    kind: "info",
    mode: "working",
    title: "Las reglas deciden",
    line: "Yo explico. La decisión siempre es de una persona.",
  },
  {
    id: "alerts",
    kind: "info",
    mode: "warning",
    title: "Si algo cambia, aviso",
    line: "Alertas cortas, solo con lo que importa.",
  },
  {
    id: "offline",
    kind: "info",
    mode: "idle",
    title: "También sin conexión",
    line: "Todo sigue funcionando aunque Tierra no responda.",
  },
  {
    id: "color",
    kind: "color",
    mode: "idle",
    title: "Elige mi color",
    line: "El que más te guste.",
  },
  {
    id: "role",
    kind: "role",
    mode: "listening",
    title: "¿Cuál es tu rol?",
    line: "Define qué información ves.",
  },
  {
    id: "source",
    kind: "source",
    mode: "working",
    title: "¿De dónde vienen tus datos?",
    line: "Conecta un reloj o una banda.",
  },
  {
    id: "xr",
    kind: "xr",
    mode: "thinking",
    title: "¿Tienes un visor XR?",
    line: "Lo usaremos para guiar los procedimientos.",
  },
];

export function shouldShowOnboarding(stored: string | null): boolean {
  return stored !== ONBOARDING_DONE;
}

export function nextStepIndex(index: number): number {
  return Math.min(index + 1, ONBOARDING_STEPS.length - 1);
}

export function prevStepIndex(index: number): number {
  return Math.max(index - 1, 0);
}

export function isLastStep(index: number): boolean {
  return index >= ONBOARDING_STEPS.length - 1;
}
