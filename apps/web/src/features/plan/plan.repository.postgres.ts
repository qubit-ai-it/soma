import type { Pool } from "pg";

import { err, type Result } from "../../shared/result.ts";
import { ACTIVE_STATUSES, planRecordSchema, type PlanRecord } from "./plan.record.ts";
import type { PlansRepository } from "./plan.repository.ts";

type Row = {
  id: string;
  subject_id: string;
  evaluation_id: string;
  level: string;
  status: string;
  revision: number;
  steps: string[];
  uncertainty: string;
  source: unknown;
  concerns: string[];
  reviews: unknown[];
  decided: unknown;
  created_at: Date;
  updated_at: Date;
};

function toPlan(row: Row): PlanRecord {
  return planRecordSchema.parse({
    id: row.id,
    subjectId: row.subject_id,
    evaluationId: row.evaluation_id,
    level: row.level,
    status: row.status,
    revision: row.revision,
    steps: row.steps,
    uncertainty: row.uncertainty,
    source: row.source,
    concerns: row.concerns,
    reviews: row.reviews,
    ...(row.decided ? { decided: row.decided } : {}),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  });
}

export function createPostgresPlansRepository(pool: Pool): PlansRepository {
  const list: PlansRepository["list"] = async (options = {}) => {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const { rows } = await pool.query<Row>(
      `select * from plans
       where ($1::text[] is null or status = any($1))
       order by updated_at desc limit $2`,
      [options.statuses ? [...options.statuses] : null, limit],
    );
    return rows.map(toPlan);
  };

  return {
    list,
    add: async (raw) => {
      const plan = planRecordSchema.parse(raw);
      const inserted = await pool.query(
        `insert into plans (id, subject_id, evaluation_id, level, status, revision, steps, uncertainty,
           source, concerns, reviews, decided, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         on conflict (evaluation_id) do nothing`,
        [
          plan.id,
          plan.subjectId,
          plan.evaluationId,
          plan.level,
          plan.status,
          plan.revision,
          JSON.stringify(plan.steps),
          plan.uncertainty,
          JSON.stringify(plan.source),
          JSON.stringify(plan.concerns),
          JSON.stringify(plan.reviews),
          plan.decided ? JSON.stringify(plan.decided) : null,
          plan.createdAt,
          plan.updatedAt,
        ],
      );
      const { rows } = await pool.query<Row>("select * from plans where evaluation_id = $1", [plan.evaluationId]);
      return { plan: toPlan(rows[0]), duplicate: inserted.rowCount === 0 };
    },
    get: async (id) => {
      const { rows } = await pool.query<Row>("select * from plans where id = $1", [id]);
      return rows[0] ? toPlan(rows[0]) : null;
    },
    latestForSubject: async (subjectId) => {
      const { rows } = await pool.query<Row>(
        "select * from plans where subject_id = $1 order by created_at desc limit 1",
        [subjectId],
      );
      return rows[0] ? toPlan(rows[0]) : null;
    },
    activeForSubject: async (subjectId) => {
      const { rows } = await pool.query<Row>(
        "select * from plans where subject_id = $1 and status = any($2) order by created_at desc limit 1",
        [subjectId, [...ACTIVE_STATUSES]],
      );
      return rows[0] ? toPlan(rows[0]) : null;
    },
    update: async (id, fn): Promise<Result<PlanRecord>> => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const { rows } = await client.query<Row>("select * from plans where id = $1 for update", [id]);
        if (!rows[0]) {
          await client.query("rollback");
          return err("Plan no encontrado.");
        }
        const result = fn(toPlan(rows[0]));
        if (!result.ok) {
          await client.query("rollback");
          return result;
        }
        const next = planRecordSchema.parse(result.value);
        await client.query(
          `update plans set status = $2, revision = $3, steps = $4, reviews = $5, decided = $6,
             updated_at = $7 where id = $1`,
          [
            id,
            next.status,
            next.revision,
            JSON.stringify(next.steps),
            JSON.stringify(next.reviews),
            next.decided ? JSON.stringify(next.decided) : null,
            next.updatedAt,
          ],
        );
        await client.query("commit");
        return { ok: true, value: next };
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
