import type { z } from "zod";

import type {
  scenarioCheckpointSchema,
  scenarioSchema,
  scenarioSeriesSchema,
} from "./scenario.schema.ts";

export type Scenario = z.infer<typeof scenarioSchema>;
export type ScenarioSeries = z.infer<typeof scenarioSeriesSchema>;
export type ScenarioCheckpoint = z.infer<typeof scenarioCheckpointSchema>;
