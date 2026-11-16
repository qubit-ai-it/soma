export const TOUR_KEY = "soma.simulation-tour.v1";

export type TourContext = {
  crewCount: number;
  profileOpen: boolean;
  lowPulse: boolean;
  emergency: boolean;
};

export type TourStep = {
  id: string;
  target: string;
  title: string;
  text: (context: TourContext) => string;
  done?: (context: TourContext) => boolean;
};

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "crew",
    target: "map",
    title: "Meet the crew",
    text: ({ crewCount }) =>
      crewCount >= 2
        ? "Each dot is a registered crew member. Everyone sees the same mission."
        : "Each dot is a registered crew member. Ask a teammate to sign up: the demo needs at least two people.",
  },
  {
    id: "profile",
    target: "crew-dot",
    title: "Open a profile",
    text: () => "Click a crew member to see their readings.",
    done: ({ profileOpen }) => profileOpen,
  },
  {
    id: "pulse",
    target: "pulse",
    title: "Trigger the emergency",
    text: () => "Set the pulse to 20 bpm or less. That is a cardiac arrest and it starts the whole flow.",
    done: ({ lowPulse }) => lowPulse,
  },
  {
    id: "evaluation",
    target: "evaluation",
    title: "The assistant decides",
    text: () => "The AI reviews the case, raises the alert and tells each teammate what to do.",
    done: ({ emergency }) => emergency,
  },
  {
    id: "notifications",
    target: "notifications",
    title: "Everyone gets their task",
    text: () => "Each crew member receives their instruction here, with a button to start the experience.",
  },
  {
    id: "experience",
    target: "experience",
    title: "Follow the guided CPR",
    text: () => "Open the experience and follow the video until help takes over.",
  },
  {
    id: "report",
    target: "report",
    title: "Review the report",
    text: () => "Then restore the readings and check Evaluation, Plan and Follow-up in the report.",
  },
] as const;

export function advanceWhileDone(index: number, context: TourContext): number {
  let current = index;
  while (current < TOUR_STEPS.length - 1 && TOUR_STEPS[current].done?.(context)) current += 1;
  return current;
}

export type Box = { top: number; left: number; width: number; height: number };

const GAP = 12;
const MARGIN = 12;

export function placeCard(
  target: Box | null,
  viewport: { width: number; height: number },
  card: { width: number; height: number },
): { top: number; left: number } {
  const clampLeft = (left: number) => Math.min(Math.max(left, MARGIN), Math.max(MARGIN, viewport.width - card.width - MARGIN));
  if (!target) {
    return {
      top: Math.max(MARGIN, (viewport.height - card.height) / 2),
      left: clampLeft((viewport.width - card.width) / 2),
    };
  }
  const left = clampLeft(target.left + target.width / 2 - card.width / 2);
  const below = target.top + target.height + GAP;
  if (below + card.height + MARGIN <= viewport.height) return { top: below, left };
  const above = target.top - GAP - card.height;
  if (above >= MARGIN) return { top: above, left };
  return { top: Math.max(MARGIN, viewport.height - card.height - MARGIN), left };
}
