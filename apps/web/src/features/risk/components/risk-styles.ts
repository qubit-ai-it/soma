import type { RiskLevel } from "../classifier.port";

// Blue/violet scale on purpose: red/amber/green belong to the body map and attention
export const LEVEL_STYLES: Record<RiskLevel, { badge: string; bar: string }> = {
  low: {
    badge: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
    bar: "bg-sky-500",
  },
  moderate: {
    badge: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
    bar: "bg-violet-500",
  },
  high: {
    badge: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950 dark:text-fuchsia-200",
    bar: "bg-fuchsia-500",
  },
};
