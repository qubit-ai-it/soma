import { err, ok, type Result } from "../../shared/result.ts";
import { isEvaluable } from "../observation/observation.logic.ts";
import type { Observation } from "../observation/observation.types.ts";
import { checkFindings } from "./findings.guardrail.ts";
import type { FindingsError, FindingsProvider, PreliminaryFindings } from "./findings.port.ts";
import { findingsOutputSchema } from "./findings.schema.ts";

export const FINDINGS_LABEL =
  "Preliminary findings · not a diagnosis · requires physician review";

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
      observation.quality.reason ?? "The image quality does not allow it to be evaluated.",
    );
  }

  let raw: Result<unknown>;
  try {
    raw = await provider.generate({ observation });
  } catch {
    return failure("provider-failed", "The findings provider did not respond.");
  }
  if (!raw.ok) return failure("provider-failed", "The findings provider did not respond.");

  const parsed = findingsOutputSchema.safeParse(raw.value);
  if (!parsed.success) {
    return failure("invalid-output", "The provider output does not have the expected format.");
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
