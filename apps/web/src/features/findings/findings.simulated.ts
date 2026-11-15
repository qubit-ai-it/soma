import { ok } from "../../shared/result.ts";
import type { FindingsProvider } from "./findings.port.ts";

export const SIMULATED_PROVIDER_NAME = "simulated-medgemma";

const FINDINGS = [
  "La imagen muestra una estructura central de contorno definido, con ecogenicidad homogénea. No se detectan artefactos de movimiento evidentes.",
  "Se observa una región central bien delimitada y tejido circundante de textura uniforme. La profundidad del campo parece adecuada.",
  "El plano capturado incluye la estructura de interés en el centro, con bordes visibles. Se sugiere que el médico compare con una captura previa.",
];

const UNCERTAINTY = [
  "Salida simulada: no proviene de un modelo médico real y no mide nada sobre la imagen.",
  "Texto de ejemplo generado sin analizar la imagen. La confianza y los límites del modelo real son desconocidos.",
];

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

export function createSimulatedFindingsProvider(): FindingsProvider {
  return {
    name: SIMULATED_PROVIDER_NAME,
    async generate({ observation }) {
      const seed = hash(`${observation.id}:${String(observation.value)}`);
      return ok({
        findings: FINDINGS[seed % FINDINGS.length],
        uncertainty: UNCERTAINTY[seed % UNCERTAINTY.length],
      });
    },
  };
}
