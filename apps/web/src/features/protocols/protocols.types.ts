import type { z } from "zod";

import type { protocolLibrarySchema, protocolSchema } from "./protocols.schema.ts";

export type Protocol = z.infer<typeof protocolSchema>;
export type ProtocolLibrary = z.infer<typeof protocolLibrarySchema>;

export type SelectionStatus = "F0" | "F1" | "F2" | "F3" | "NOT_EVALUABLE";

// structurally satisfied by rules `Evaluation`
export type SelectionInput = {
  status: SelectionStatus;
  triggeredRules: readonly string[];
  evidence: readonly (
    | { kind: "signal"; signal: string }
    | { kind: "convergence"; signals: readonly string[] }
  )[];
};

export type ProtocolSelection = {
  protocol: Protocol;
  matchedBy: string[];
};
