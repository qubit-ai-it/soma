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
    title: "I'm Sentry",
    line: "I support the crew and monitor changes in their health.",
  },
  {
    id: "baseline",
    kind: "info",
    mode: "thinking",
    title: "Everyone has a personal baseline",
    line: "I compare each astronaut with their own history.",
  },
  {
    id: "rules",
    kind: "info",
    mode: "working",
    title: "Rules decide",
    line: "I explain. A person always makes the final decision.",
  },
  {
    id: "alerts",
    kind: "info",
    mode: "warning",
    title: "I flag changes",
    line: "Brief alerts with the information that matters.",
  },
  {
    id: "offline",
    kind: "info",
    mode: "idle",
    title: "Available offline",
    line: "The system keeps working when Earth cannot respond.",
  },
  {
    id: "color",
    kind: "color",
    mode: "idle",
    title: "Choose my color",
    line: "Pick your favorite.",
  },
  {
    id: "role",
    kind: "role",
    mode: "listening",
    title: "What is your role?",
    line: "Your role determines which information you can view.",
  },
  {
    id: "source",
    kind: "source",
    mode: "working",
    title: "Where does your data come from?",
    line: "Connect a watch or band.",
  },
  {
    id: "xr",
    kind: "xr",
    mode: "thinking",
    title: "Do you have an XR headset?",
    line: "We will use it to guide procedures.",
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
