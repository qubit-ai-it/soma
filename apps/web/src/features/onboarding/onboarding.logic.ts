import type { SentryMode } from "../../shared/sentry.types.ts";

export const ONBOARDING_KEY = "soma.onboarding.v2";
export const ONBOARDING_DONE = "done";

export const SETUP_KINDS = ["color", "role", "source", "xr", "account"] as const;
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
    line: "Your intelligent health assistant in space.",
  },
  {
    id: "pitch",
    kind: "info",
    mode: "thinking",
    title: "Ready before it matters",
    line: "I connect crew health, capabilities and resources to anticipate risks.",
  },
  {
    id: "readiness",
    kind: "info",
    mode: "working",
    title: "Built for emergencies",
    line: "I support emergency response and strengthen medical preparedness.",
  },
  {
    id: "baseline",
    kind: "info",
    mode: "thinking",
    title: "Everyone is their own baseline",
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
    title: "If something changes, I speak up",
    line: "Short alerts, only what matters.",
  },
  {
    id: "offline",
    kind: "info",
    mode: "idle",
    title: "Works offline too",
    line: "Everything keeps working even if Earth goes silent.",
  },
  {
    id: "color",
    kind: "color",
    mode: "idle",
    title: "Pick my color",
    line: "Whichever you like best.",
  },
  {
    id: "role",
    kind: "role",
    mode: "listening",
    title: "What is your role?",
    line: "It sets which information you see.",
  },
  {
    id: "source",
    kind: "source",
    mode: "working",
    title: "Where does your data come from?",
    line: "Connect a watch or a band.",
  },
  {
    id: "xr",
    kind: "xr",
    mode: "thinking",
    title: "Do you have an XR headset?",
    line: "We'll use it to guide procedures.",
  },
  {
    id: "account",
    kind: "account",
    mode: "listening",
    title: "Join the crew",
    line: "Create your account to start the simulation.",
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
