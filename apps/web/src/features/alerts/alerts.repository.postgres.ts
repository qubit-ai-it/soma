import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import { err, type Result } from "../../shared/result.ts";
import type { AlertsRepository, AuditRepository } from "./alerts.repository.ts";
import { alertSchema, auditEntrySchema } from "./alerts.schema.ts";
import type { Alert, AuditEntry } from "./alerts.types.ts";
import { appendEntry } from "./audit.logic.ts";

const AUDIT_LOCK = 724001;

type Clock = { now: () => string; makeId: () => string };
const systemClock: Clock = { now: () => new Date().toISOString(), makeId: () => randomUUID() };

type AlertRow = {
  id: string;
  member_id: string;
  member_label: string;
  level: string;
  title: string;
  action: string;
  recipients: string[];
  clinical_detail: string | null;
  status: string;
  created_at: Date;
  source: string;
  acknowledged: unknown;
  closed: unknown;
};

function toAlert(row: AlertRow): Alert {
  return alertSchema.parse({
    id: row.id,
    memberId: row.member_id,
    memberLabel: row.member_label,
    level: row.level,
    title: row.title,
    action: row.action,
    recipients: row.recipients,
    ...(row.clinical_detail ? { clinicalDetail: row.clinical_detail } : {}),
    status: row.status,
    createdAt: row.created_at.toISOString(),
    source: row.source,
    ...(row.acknowledged ? { acknowledged: row.acknowledged } : {}),
    ...(row.closed ? { closed: row.closed } : {}),
  });
}

const INSERT_ALERT = `
  insert into alerts (id, member_id, member_label, level, title, action, recipients,
    clinical_detail, status, created_at, source, acknowledged, closed)
  values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`;

function alertParams(a: Alert) {
  return [
    a.id,
    a.memberId,
    a.memberLabel,
    a.level,
    a.title,
    a.action,
    a.recipients,
    a.clinicalDetail ?? null,
    a.status,
    a.createdAt,
    a.source,
    a.acknowledged ? JSON.stringify(a.acknowledged) : null,
    a.closed ? JSON.stringify(a.closed) : null,
  ];
}

export function createPostgresAlertsRepository(
  pool: Pool,
  ready: Promise<void> = Promise.resolve(),
): AlertsRepository {
  return {
    list: async () => {
      await ready;
      const { rows } = await pool.query<AlertRow>("select * from alerts order by created_at asc, id asc");
      return rows.map(toAlert);
    },
    get: async (id) => {
      await ready;
      const { rows } = await pool.query<AlertRow>("select * from alerts where id = $1", [id]);
      return rows[0] ? toAlert(rows[0]) : null;
    },
    add: async (alert) => {
      await ready;
      const parsed = alertSchema.parse(alert);
      const inserted = await pool.query(`${INSERT_ALERT} on conflict (id) do nothing`, alertParams(parsed));
      const { rows } = await pool.query<AlertRow>("select * from alerts where id = $1", [parsed.id]);
      return { alert: toAlert(rows[0]), duplicate: inserted.rowCount === 0 };
    },
    transition: async (id, fn): Promise<Result<Alert>> => {
      await ready;
      const client = await pool.connect();
      try {
        await client.query("begin");
        const { rows } = await client.query<AlertRow>("select * from alerts where id = $1 for update", [id]);
        if (!rows[0]) {
          await client.query("rollback");
          return err("Alert not found");
        }
        const result = fn(toAlert(rows[0]));
        if (!result.ok) {
          await client.query("rollback");
          return result;
        }
        const next = alertSchema.parse(result.value);
        await client.query(
          `update alerts set status = $2, acknowledged = $3, closed = $4 where id = $1`,
          [
            id,
            next.status,
            next.acknowledged ? JSON.stringify(next.acknowledged) : null,
            next.closed ? JSON.stringify(next.closed) : null,
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

type AuditRow = {
  id: string;
  seq: number;
  at: Date;
  action: string;
  actor: unknown;
  subject_id: string | null;
  alert_id: string | null;
  detail: string | null;
  ai_proposal: unknown;
  human_decision: unknown;
  idempotency_key: string | null;
  prev_hash: string;
  hash: string;
};

function toEntry(row: AuditRow): AuditEntry {
  return auditEntrySchema.parse({
    id: row.id,
    seq: row.seq,
    at: row.at.toISOString(),
    action: row.action,
    actor: row.actor,
    ...(row.subject_id ? { subjectId: row.subject_id } : {}),
    ...(row.alert_id ? { alertId: row.alert_id } : {}),
    ...(row.detail ? { detail: row.detail } : {}),
    ...(row.ai_proposal ? { aiProposal: row.ai_proposal } : {}),
    ...(row.human_decision ? { humanDecision: row.human_decision } : {}),
    ...(row.idempotency_key ? { idempotencyKey: row.idempotency_key } : {}),
    prevHash: row.prev_hash,
    hash: row.hash,
  });
}

const INSERT_ENTRY = `
  insert into audit_entries (id, seq, at, action, actor, subject_id, alert_id, detail,
    ai_proposal, human_decision, idempotency_key, prev_hash, hash)
  values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`;

function entryParams(e: AuditEntry) {
  return [
    e.id,
    e.seq,
    e.at,
    e.action,
    JSON.stringify(e.actor),
    e.subjectId ?? null,
    e.alertId ?? null,
    e.detail ?? null,
    e.aiProposal ? JSON.stringify(e.aiProposal) : null,
    e.humanDecision ? JSON.stringify(e.humanDecision) : null,
    e.idempotencyKey ?? null,
    e.prevHash,
    e.hash,
  ];
}

export function createPostgresAuditRepository(
  pool: Pool,
  ready: Promise<void> = Promise.resolve(),
  clock: Clock = systemClock,
): AuditRepository {
  return {
    list: async () => {
      await ready;
      const { rows } = await pool.query<AuditRow>("select * from audit_entries order by seq asc");
      return rows.map(toEntry);
    },
    append: async (input) => {
      await ready;
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query("select pg_advisory_xact_lock($1)", [AUDIT_LOCK]);
        if (input.idempotencyKey) {
          const existing = await client.query<AuditRow>(
            "select * from audit_entries where idempotency_key = $1",
            [input.idempotencyKey],
          );
          if (existing.rows[0]) {
            await client.query("commit");
            return { entry: toEntry(existing.rows[0]), duplicate: true };
          }
        }
        const tail = await client.query<AuditRow>(
          "select * from audit_entries order by seq desc limit 1",
        );
        const tailEntries = tail.rows[0] ? [toEntry(tail.rows[0])] : [];
        const result = appendEntry(tailEntries, input, { id: clock.makeId(), at: clock.now() });
        await client.query(INSERT_ENTRY, entryParams(result.entry));
        await client.query("commit");
        return { entry: result.entry, duplicate: false };
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export async function seedAlertsAndAudit(
  pool: Pool,
  seed: { alerts: readonly Alert[]; entries: readonly AuditEntry[] },
): Promise<void> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock($1)", [AUDIT_LOCK]);
    const alerts = await client.query("select 1 from alerts limit 1");
    if (alerts.rowCount === 0) {
      for (const alert of seed.alerts) await client.query(INSERT_ALERT, alertParams(alert));
    }
    const audit = await client.query("select 1 from audit_entries limit 1");
    if (audit.rowCount === 0) {
      for (const entry of seed.entries) await client.query(INSERT_ENTRY, entryParams(entry));
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
