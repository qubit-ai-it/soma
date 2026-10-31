export const PLAN_DISCLAIMER = "Borrador · requiere validación humana";

export function describePlanSource(source: { provider: string; mode: string }): {
  badge: string | null;
  detail: string;
} {
  const detail = `${source.provider} · ${source.mode}`;
  if (source.provider === "fixture") return { badge: "Plan de respaldo · fixture", detail };
  if (source.mode === "mock") return { badge: "Simulado", detail };
  return { badge: null, detail };
}
