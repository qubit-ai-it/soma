import type { Severity } from "../crew.types";

export const SEVERITY_META: Record<
  Severity,
  { label: string; badge: string; swatch: string }
> = {
  ok: {
    label: "Todo bien",
    badge: "bg-ok/15 text-ok",
    swatch: "bg-ok",
  },
  "possible-risk": {
    label: "Posible riesgo",
    badge: "bg-warn/15 text-warn",
    swatch: "bg-warn",
  },
  risky: {
    label: "Riesgoso",
    badge: "bg-danger/15 text-danger",
    swatch: "bg-danger",
  },
};
