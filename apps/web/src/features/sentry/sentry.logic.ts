import { LIVE_CALIBRATION_BINS, LIVE_RULESET } from "../live/live.logic.ts";
import { isEvaluable } from "../observation/observation.logic.ts";
import type { Observation } from "../observation/observation.types.ts";
import { ENGINE_VERSION, evaluate } from "../rules/rules.engine.ts";
import type { Evaluation, RuleSet, Status } from "../rules/rules.types.ts";
import type { Alert } from "../alerts/alerts.types.ts";

export const SENTRY_ACTOR = "sentry";
export const SENTRY_RULESET: RuleSet = LIVE_RULESET;
export const SENTRY_CALIBRATION = LIVE_CALIBRATION_BINS;
export const DEBOUNCE_WINDOW_MS = 10 * 60_000;
export const HYSTERESIS_MS = 30 * 60_000;
export const STALE_AFTER_MS = 10 * 60_000;

const ALERTABLE: readonly Status[] = ["F2", "F3", "NOT_EVALUABLE"];
const RANK: Record<Status, number> = { F0: 0, F1: 1, F2: 2, NOT_EVALUABLE: 2, F3: 3 };

export function isAlertable(status: Status): status is Alert["level"] {
  return ALERTABLE.includes(status);
}

export function deriveEvaluation(
  observations: readonly Observation[],
  options: { ruleSet?: RuleSet; calibration?: number } = {},
): Evaluation | null {
  const ruleSet = options.ruleSet ?? SENTRY_RULESET;
  const calibration = options.calibration ?? SENTRY_CALIBRATION;
  if (observations.length === 0) return null;
  const sorted = [...observations].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const valid = sorted.filter(isEvaluable);
  if (valid.length <= calibration) return null;
  const baselineUntil = new Date(Date.parse(valid[calibration - 1].observedAt) + 1).toISOString();
  return evaluate({
    subjectId: sorted[0].subjectId,
    observations: sorted,
    ruleSet,
    minBaselineObservations: calibration,
    baselineUntil,
    evaluatedAt: sorted[sorted.length - 1].observedAt,
  });
}

export function shouldRaise(
  next: Status,
  history: readonly { status: Status; evaluatedAt: string }[],
  nowMs: number,
  hysteresisMs = HYSTERESIS_MS,
): boolean {
  if (!isAlertable(next)) return false;
  return !history.some(
    (past) =>
      isAlertable(past.status) &&
      nowMs - Date.parse(past.evaluatedAt) <= hysteresisMs &&
      RANK[past.status] >= RANK[next],
  );
}

export function alertCopy(level: Alert["level"]): { title: string; action: string } {
  if (level === "F3") {
    return {
      title: "Alerta F3: se requiere acción inmediata",
      action: "Evaluación médica inmediata y notificación a Tierra",
    };
  }
  if (level === "F2") {
    return {
      title: "Frecuencia cardíaca sostenida sobre su línea base",
      action: "Revisión por el médico de a bordo",
    };
  }
  return {
    title: "No hay datos suficientes para evaluar",
    action: "Revisar el sensor o reportar a mano",
  };
}

export function clinicalDetailFor(evaluation: Evaluation): string | undefined {
  const signal = evaluation.evidence.find((e) => e.kind === "signal");
  if (!signal || signal.kind !== "signal") return undefined;
  const delta = signal.normalizedDeltas[signal.normalizedDeltas.length - 1];
  const center = Math.round(signal.baseline.center);
  return delta === undefined
    ? `Línea base de ${center} bpm.`
    : `Desviación de ${delta.toFixed(1)} sobre su línea base de ${center} bpm.`;
}

export function staleMinutes(lastObservedAt: string, nowMs: number): number {
  return Math.floor((nowMs - Date.parse(lastObservedAt)) / 60_000);
}

export function staleEvaluation(subjectId: string, nowMs: number): Evaluation {
  return {
    status: "NOT_EVALUABLE",
    subjectId,
    evaluatedAt: new Date(nowMs).toISOString(),
    ruleSetVersion: SENTRY_RULESET.version,
    engineVersion: ENGINE_VERSION,
    triggeredRules: [],
    evidence: [],
    limitations: ["stale-data:heartRate"],
  };
}
