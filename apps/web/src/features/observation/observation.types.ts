import type { z } from "zod";

import type {
  observationSchema,
  provenanceTypeSchema,
  qualityStateSchema,
} from "./observation.schema.ts";

export type Observation = z.infer<typeof observationSchema>;
export type ProvenanceType = z.infer<typeof provenanceTypeSchema>;
export type QualityState = z.infer<typeof qualityStateSchema>;
