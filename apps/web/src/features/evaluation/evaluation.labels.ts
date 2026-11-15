import type { Status } from "../rules/rules.types.ts";
import type { LimitationView } from "./evaluation.types.ts";

export const SIGNAL_LABEL: Record<string, string> = {
  sleepHours: "Sueño",
  hrv: "Variabilidad cardíaca (HRV)",
  heartRate: "Frecuencia cardíaca",
  fatigue: "Fatiga autorreportada",
};

export const RULE_LABEL: Record<string, string> = {
  "sleep-low": "Sueño por debajo de su baseline",
  "hrv-low": "HRV por debajo de su baseline",
  "hrv-low-persistent": "HRV baja de forma persistente",
  "fatigue-high": "Fatiga por encima de su baseline",
  "heart-rate-high": "Frecuencia cardíaca por encima de su baseline",
  "heart-rate-critical": "Frecuencia cardíaca en rango crítico (regla de demostración)",
  "conv-3": "Tres o más señales desviadas a la vez",
};

export const STATUS_COPY: Record<Status, { name: string; summary: string }> = {
  F0: { name: "F0", summary: "Dentro de su variación habitual" },
  F1: { name: "F1", summary: "Desviación leve respecto a su baseline" },
  F2: { name: "F2", summary: "Desviación persistente o convergente" },
  F3: { name: "F3", summary: "Regla crítica de demostración activada" },
  NOT_EVALUABLE: { name: "NO EVALUABLE", summary: "No hay datos suficientes para evaluar" },
};

export const NOT_EVALUABLE_MESSAGE =
  "La ausencia de datos no es normalidad: SOMA no afirma que todo esté bien cuando no puede evaluar.";

export const SCENARIO_COPY: Record<string, { title: string; description: string }> = {
  "fatigue-sleep-hrv": {
    title: "Sueño reducido, HRV en descenso y fatiga",
    description:
      "Diez días de baseline estable y luego una semana de sueño corto, HRV a la baja y fatiga creciente. Termina en F2.",
  },
  "critical-f3": {
    title: "Pico de frecuencia cardíaca",
    description:
      "Baseline estable y un salto abrupto de una sola señal que activa la regla crítica. Termina en F3.",
  },
  "insufficient-data": {
    title: "Sensor de HRV sin datos",
    description:
      "El sensor de HRV casi no registró durante el baseline y sigue sin datos. Termina en NO EVALUABLE.",
  },
};

export const CHECKPOINT_LABEL: Record<string, string> = {
  "Baseline stable": "Baseline estable",
  "Normal variation": "Variación normal",
  "Early deviation": "Desviación temprana",
  "Deviation continues": "La desviación continúa",
  "Persistent and converging": "Persistente y convergente",
  Sustained: "Sostenida",
  "Critical spike": "Pico crítico",
  "Sensor gap": "Hueco del sensor",
  "Short baseline": "Baseline corto",
  "Still without HRV": "Aún sin HRV",
  "No new HRV data": "Sin datos nuevos de HRV",
  "Not evaluable": "No evaluable",
};

export const PROVENANCE_LABEL: Record<string, string> = {
  real: "Real",
  historical: "Histórico",
  synthetic: "Sintético",
};

export const QUALITY_LABEL: Record<string, string> = {
  valid: "Válida",
  suspect: "Dudosa",
  invalid: "Inválida",
  missing: "Sin dato",
};

export function formatNumber(value: number, digits = 1): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export function signalLabel(signal: string): string {
  return SIGNAL_LABEL[signal] ?? signal;
}

export function translateLimitation(
  code: string,
  minBaselineObservations: number,
): LimitationView {
  const [kind, signal, reason] = code.split(":");
  const name = signal ? signalLabel(signal) : "";

  if (kind === "insufficient-baseline" && signal) {
    const text =
      reason === "mixed-units"
        ? `${name}: el baseline mezcla unidades distintas y no es comparable.`
        : `${name}: el baseline tiene menos de ${minBaselineObservations} observaciones válidas.`;
    return { code, signal, text };
  }
  if (kind === "zero-variability" && signal) {
    return {
      code,
      signal,
      text: `${name}: el baseline no tiene variabilidad, así que no se puede normalizar la desviación.`,
    };
  }
  if (kind === "no-recent-observations" && signal) {
    return {
      code,
      signal,
      text: `${name}: no hay observaciones válidas posteriores al baseline.`,
    };
  }
  return { code, signal: signal ?? null, text: `Limitación no reconocida (${code}).` };
}
