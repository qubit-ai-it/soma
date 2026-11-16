import type { Evaluation } from "../rules/rules.types.ts";

export type StoredEvaluation = Evaluation & { id: string };

export type EvaluationsRepository = {
  saveIfChanged(evaluation: Evaluation): Promise<{
    evaluation: StoredEvaluation;
    saved: boolean;
    previous: StoredEvaluation | null;
    history: StoredEvaluation[];
  }>;
  latest(subjectId: string): Promise<StoredEvaluation | null>;
  history(subjectId: string, options?: { since?: string; limit?: number }): Promise<StoredEvaluation[]>;
};
