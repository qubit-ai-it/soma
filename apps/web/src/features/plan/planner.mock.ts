import { ok } from "../../shared/result.ts";
import { mockSource } from "../../shared/source.ts";
import type { CarePlanner, PlanInput } from "./planner.port.ts";

type Random = () => number;
type RiskLevel = PlanInput["riskLevel"];

const STEPS: Record<RiskLevel, string[]> = {
  low: [
    "Mantener la rutina habitual de ejercicio y sueño.",
    "Repetir el control diario de signos vitales a la hora programada.",
    "Registrar la hidratación y las comidas de las próximas 24 horas.",
    "Compartir el check-in diario con el cirujano de vuelo.",
  ],
  moderate: [
    "Repetir las mediciones después de un periodo de reposo.",
    "Ajustar el horario de trabajo para permitir una ventana de sueño más larga.",
    "Aumentar la hidratación y revisar el plan del refugio contra radiación.",
    "Hacer un check-in extra con Sentry en las próximas 6 horas.",
    "Pedir al cirujano de vuelo que revise la tendencia.",
  ],
  high: [
    "Suspender las actividades no esenciales y descansar.",
    "Repetir las mediciones después de 15 minutos.",
    "Avisar ahora al cirujano de vuelo.",
    "Preparar el refugio contra radiación si el clima espacial está elevado.",
    "Prepararse para escalar al control de Tierra.",
  ],
};

const UNCERTAINTY = [
  "Borrador preliminar. No usa el historial completo del tripulante y requiere validación médica.",
  "Los pasos son generales y no están validados por un médico.",
  "Se desconocen la confianza y los límites del análisis; requiere validación médica.",
];

function pick<T>(items: T[], random: Random): T {
  return items[Math.min(Math.floor(random() * items.length), items.length - 1)];
}

function sample<T>(items: T[], count: number, random: Random): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function createMockPlanner({
  random = Math.random,
}: { random?: Random } = {}): CarePlanner {
  return {
    async draft(input) {
      const focus = input.concerns.length
        ? input.concerns.join(", ")
        : "sin señales marcadas";
      return ok({
        steps: [
          `Revisar las señales marcadas: ${focus}.`,
          ...sample(STEPS[input.riskLevel], 3, random),
        ],
        uncertainty: pick(UNCERTAINTY, random),
        requiresHumanValidation: true,
        source: mockSource("simulated-medgemma"),
      });
    },
  };
}
