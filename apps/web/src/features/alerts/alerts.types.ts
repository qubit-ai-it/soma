import type { z } from "zod";

import type {
  actorSchema,
  aiProposalSchema,
  alertSchema,
  auditEntrySchema,
  humanDecisionSchema,
} from "./alerts.schema.ts";

export type Actor = z.infer<typeof actorSchema>;
export type AiProposal = z.infer<typeof aiProposalSchema>;
export type HumanDecision = z.infer<typeof humanDecisionSchema>;
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type Alert = z.infer<typeof alertSchema>;
export type AlertLevel = Alert["level"];
export type AlertStatus = Alert["status"];

export type NewAuditEntry = Omit<AuditEntry, "id" | "seq" | "at" | "prevHash" | "hash">;

export type AlertView = Omit<Alert, "clinicalDetail"> & { clinicalDetail?: string };
