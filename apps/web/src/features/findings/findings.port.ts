import type { Result } from "../../shared/result.ts";
import type { SourceInfo } from "../../shared/source.ts";
import type { Observation } from "../observation/observation.types.ts";
import type { FindingsOutput } from "./findings.schema.ts";

export type FindingsInput = { observation: Observation };

export interface FindingsProvider {
  readonly name: string;
  generate(input: FindingsInput): Promise<Result<FindingsOutput>>;
}

export type FindingsErrorCode =
  | "image-not-evaluable"
  | "provider-failed"
  | "invalid-output"
  | "guardrail-blocked";

export type FindingsError = { code: FindingsErrorCode; reason: string };

export type PreliminaryFindings = {
  observationId: string;
  findings: string;
  uncertainty: string;
  label: string;
  // literal true: findings are never typed as reviewed
  requiresHumanReview: true;
  source: SourceInfo;
};
