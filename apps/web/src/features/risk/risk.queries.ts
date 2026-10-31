import "server-only";

import { getServices } from "../../server/services.ts";
import type { RiskBadgeDTO, RiskRequest } from "./risk.types.ts";

export async function getRiskBadges(
  requests: RiskRequest[],
): Promise<Record<string, RiskBadgeDTO | null>> {
  const { classifier } = getServices();
  const entries = await Promise.all(
    requests.map(async ({ id, ...input }) => {
      const result = await classifier.classify(input);
      if (!result.ok) return [id, null] as const;
      const a = result.value;
      const dto: RiskBadgeDTO = {
        level: a.level,
        probabilities: a.probabilities,
        confidence: a.confidence,
        lowConfidence: a.lowConfidence,
        calibrated: a.calibrated,
        provider: a.source.provider,
        mode: a.source.mode,
      };
      return [id, dto] as const;
    }),
  );
  return Object.fromEntries(entries);
}
