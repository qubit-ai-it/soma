import type { Pool } from "pg";

import { err, type Result } from "../../shared/result.ts";
import { followUpRecordSchema, type FollowUpRecord } from "./followup.record.ts";
import type { FollowUpsRepository } from "./followup.repository.ts";

type Row = {
  id: string;
  plan_id: string;
  subject_id: string;
  status: string;
  contract: unknown;
  reports: unknown;
  created_at: Date;
  updated_at: Date;
};

function toRecord(row: Row): FollowUpRecord {
  return followUpRecordSchema.parse({
    id: row.id,
    planId: row.plan_id,
    subjectId: row.subject_id,
    status: row.status,
    contract: row.contract,
    reports: row.reports,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  });
}

export function createPostgresFollowUpsRepository(pool: Pool): FollowUpsRepository {
  return {
    add: async (raw) => {
      const record = followUpRecordSchema.parse(raw);
      const inserted = await pool.query(
        `insert into followups (id, plan_id, subject_id, status, contract, reports, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (plan_id) do nothing`,
        [
          record.id,
          record.planId,
          record.subjectId,
          record.status,
          JSON.stringify(record.contract),
          JSON.stringify(record.reports),
          record.createdAt,
          record.updatedAt,
        ],
      );
      const { rows } = await pool.query<Row>("select * from followups where plan_id = $1", [record.planId]);
      return { record: toRecord(rows[0]), duplicate: inserted.rowCount === 0 };
    },
    getByPlan: async (planId) => {
      const { rows } = await pool.query<Row>("select * from followups where plan_id = $1", [planId]);
      return rows[0] ? toRecord(rows[0]) : null;
    },
    latestForSubject: async (subjectId) => {
      const { rows } = await pool.query<Row>(
        "select * from followups where subject_id = $1 order by created_at desc limit 1",
        [subjectId],
      );
      return rows[0] ? toRecord(rows[0]) : null;
    },
    listActive: async () => {
      const { rows } = await pool.query<Row>("select * from followups where status = 'active' order by created_at asc");
      return rows.map(toRecord);
    },
    update: async (id, fn): Promise<Result<FollowUpRecord>> => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const { rows } = await client.query<Row>("select * from followups where id = $1 for update", [id]);
        if (!rows[0]) {
          await client.query("rollback");
          return err("Seguimiento no encontrado.");
        }
        const result = fn(toRecord(rows[0]));
        if (!result.ok) {
          await client.query("rollback");
          return result;
        }
        const next = followUpRecordSchema.parse(result.value);
        await client.query("update followups set status = $2, reports = $3, updated_at = $4 where id = $1", [
          id,
          next.status,
          JSON.stringify(next.reports),
          next.updatedAt,
        ]);
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
