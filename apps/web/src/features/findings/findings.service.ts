import { err, ok, type Result } from "../../shared/result.ts";
import { isEvaluable } from "../observation/observation.logic.ts";
import type { Observation } from "../observation/observation.types.ts";
import { checkFindings } from "./findings.guardrail.ts";
import type { FindingsError, FindingsProvider, PreliminaryFindings } from "./findings.port.ts";
import { findingsOutputSchema } from "./findings.schema.ts";

export const FINDINGS_LABEL =
  "Hallazgos preliminares · no es un diagnóstico · requiere revisión del médico";

function failure(code: FindingsError["code"], reason: string): Result<never, FindingsError> {
  return err({ code, reason });
}

export async function requestFindings(
  provider: FindingsProvider,
  observation: Observation,
  options: { now?: () => string } = {},
): Promise<Result<PreliminaryFindings, FindingsError>> {
  if (!isEvaluable(observation)) {
    return failure(
      "image-not-evaluable",
      observation.quality.reason ?? "La calidad de la imagen no permite evaluarla.",
    );
  }

  let raw: Result<unknown>;
  try {
    raw = await provider.generate({ observation });
  } catch {
    return failure("provider-failed", "El proveedor de hallazgos no respondió.");
  }
  if (!raw.ok) return failure("provider-failed", "El proveedor de hallazgos no respondió.");

  const parsed = findingsOutputSchema.safeParse(raw.value);
  if (!parsed.success) {
    return failure("invalid-output", "La salida del proveedor no tiene el formato esperado.");
  }

  for (const text of [parsed.data.findings, parsed.data.uncertainty]) {
    const verdict = checkFindings(text);
    if (!verdict.allowed) return failure("guardrail-blocked", verdict.reason);
  }

  const now = options.now ?? (() => new Date().toISOString());
  return ok({
    observationId: observation.id,
    findings: parsed.data.findings,
    uncertainty: parsed.data.uncertainty,
    label: FINDINGS_LABEL,
    requiresHumanReview: true,
    source: { provider: provider.name, mode: "mock", fetchedAt: now() },
  });
}
