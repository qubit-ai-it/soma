import type { RiskLevel } from "../classifier.port";

// Blue scale on purpose: ok/warn/danger belong to the body map and attention
export const LEVEL_STYLES: Record<RiskLevel, { badge: string; bar: string }> = {
  low: { badge: "bg-accent-soft text-signal", bar: "bg-signal/50" },
  moderate: { badge: "bg-accent/30 text-foreground", bar: "bg-signal" },
  high: { badge: "bg-accent text-accent-foreground", bar: "bg-accent" },
};
