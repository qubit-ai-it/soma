import type { Severity } from "../crew.types";

export const SEVERITY_META: Record<
  Severity,
  { label: string; badge: string; swatch: string }
> = {
  ok: {
    label: "Todo bien",
    badge: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    swatch: "bg-emerald-600",
  },
  "possible-risk": {
    label: "Posible riesgo",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    swatch: "bg-amber-500",
  },
  risky: {
    label: "Riesgoso",
    badge: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
    swatch: "bg-red-600",
  },
};
