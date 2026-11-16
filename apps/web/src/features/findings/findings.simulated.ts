import { ok } from "../../shared/result.ts";
import type { FindingsProvider } from "./findings.port.ts";

export const SIMULATED_PROVIDER_NAME = "simulated-medgemma";

const FINDINGS = [
  "The image shows a central structure with a defined outline and homogeneous echogenicity. No obvious motion artifacts are detected.",
  "A well-delimited central region and surrounding tissue of uniform texture are observed. The field depth appears adequate.",
  "The captured plane includes the structure of interest in the center, with visible edges. The physician is advised to compare it with a previous capture.",
];

const UNCERTAINTY = [
  "Preliminary result: the confidence of the analysis is not established and a physician must review it.",
  "Preliminary description of the image. The limits of the analysis are unknown; physician review is required.",
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
