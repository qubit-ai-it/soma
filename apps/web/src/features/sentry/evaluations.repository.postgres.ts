import { randomUUID } from "node:crypto";

import type { Pool } from "pg";

import type { Evaluation, Status } from "../rules/rules.types.ts";
import type { EvaluationsRepository, StoredEvaluation } from "./evaluations.repository.ts";

type Row = {
  id: string;
  subject_id: string;
  evaluated_at: Date;
  status: string;
  rule_set_version: string;
  engine_version: string;
  triggered_rules: string[];
  evidence: Evaluation["evidence"];
  limitations: string[];
};

function toStored(row: Row): StoredEvaluation {
  return {
    id: row.id,
    subjectId: row.subject_id,
    evaluatedAt: row.evaluated_at.toISOString(),
    status: row.status as Status,
    ruleSetVersion: row.rule_set_version,
    engineVersion: row.engine_version,
    triggeredRules: row.triggered_rules,
    evidence: row.evidence,
    limitations: row.limitations,
  };
}

export function createPostgresEvaluationsRepository(pool: Pool): EvaluationsRepository {
  const history: EvaluationsRepository["history"] = async (subjectId, options = {}) => {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
    const { rows } = await pool.query<Row>(
      `select * from evaluations
       where subject_id = $1 and ($2::timestamptz is null or evaluated_at >= $2)
       order by evaluated_at desc, created_at desc
       limit $3`,
      [subjectId, options.since ?? null, limit],
    );
    return rows.map(toStored);
  };

  return {
    history,
    latest: async (subjectId) => (await history(subjectId, { limit: 1 }))[0] ?? null,
    saveIfChanged: async (evaluation) => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [`evaluations:${evaluation.subjectId}`]);
        const recent = await client.query<Row>(
          `select * from evaluations where subject_id = $1
           order by evaluated_at desc, created_at desc limit 50`,
          [evaluation.subjectId],
        );
        const past = recent.rows.map(toStored);
        const previous = past[0] ?? null;
        const stale = previous !== null && Date.parse(evaluation.evaluatedAt) < Date.parse(previous.evaluatedAt);
        if (previous && (stale || previous.status === evaluation.status)) {
          await client.query("commit");
          return { evaluation: previous, saved: false, previous, history: past };
        }
        const stored: StoredEvaluation = { ...evaluation, id: `ev-${randomUUID()}` };
        await client.query(
          `insert into evaluations (id, subject_id, evaluated_at, status, rule_set_version,
             engine_version, triggered_rules, evidence, limitations)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            stored.id,
            stored.subjectId,
            stored.evaluatedAt,
            stored.status,
            stored.ruleSetVersion,
            stored.engineVersion,
            JSON.stringify(stored.triggeredRules),
            JSON.stringify(stored.evidence),
            JSON.stringify(stored.limitations),
          ],
        );
        await client.query("commit");
        return { evaluation: stored, saved: true, previous, history: past };
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
