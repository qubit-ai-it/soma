import { observationSchema } from "../observation/observation.schema.ts";
import type { Observation } from "../observation/observation.types.ts";
import type { Scenario } from "./scenario.types.ts";

const OBSERVATION_HOUR_UTC = 8;

function observedAt(startDate: string, dayOffset: number): string {
  const [year, month, day] = startDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + dayOffset, OBSERVATION_HOUR_UTC))
    .toISOString()
    .replace(".000Z", "Z");
}

export function buildObservations(scenario: Scenario): Observation[] {
  return scenario.series.flatMap((series) =>
    series.values.map((value, index) =>
      observationSchema.parse({
        id: `${scenario.id}-${series.signal}-${index}`,
        subjectId: scenario.subjectId,
        signal: series.signal,
        value,
        unit: series.unit,
        observedAt: observedAt(scenario.startDate, index),
        provenance: {
          type: "synthetic",
          source: series.source,
          ...(series.device === undefined ? {} : { device: series.device }),
        },
        quality:
          value === null
            ? { state: "missing", reason: "sensor-unavailable" }
            : { state: "valid" },
      }),
    ),
  );
}
