import "server-only";

import { getServices } from "../../server/services.ts";
import type { RiskInput } from "./classifier.port.ts";
import type { RiskBadgeDTO, RiskRequest } from "./risk.types.ts";

export async function getRisk(input: RiskInput): Promise<RiskBadgeDTO | null> {
  const result = await getServices().classifier.classify(input);
  if (!result.ok) return null;
  const a = result.value;
  return {
    level: a.level,
    probabilities: a.probabilities,
    confidence: a.confidence,
    lowConfidence: a.lowConfidence,
    calibrated: a.calibrated,
    provider: a.source.provider,
    mode: a.source.mode,
  };
}

export async function getRiskBadges(
  requests: RiskRequest[],
): Promise<Record<string, RiskBadgeDTO | null>> {
  const entries = await Promise.all(
    requests.map(async ({ id, ...input }) => [id, await getRisk(input)] as const),
  );
  return Object.fromEntries(entries);
}
