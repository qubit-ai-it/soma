import type { Pool } from "pg";

import { observationSchema } from "./observation.schema.ts";
import type { ObservationsRepository } from "./observation.repository.ts";
import type { Observation } from "./observation.types.ts";

type Row = {
  id: string;
  subject_id: string;
  signal: string;
  value_num: number | null;
  value_text: string | null;
  unit: string;
  observed_at: Date;
  received_at: Date;
  mission_time: string | null;
  provenance_type: string;
  provenance_source: string;
  provenance_device: string | null;
  provenance_dataset: string | null;
  quality_state: string;
  quality_reason: string | null;
  processing_version: string | null;
};

function toObservation(row: Row): Observation {
  return observationSchema.parse({
    id: row.id,
    subjectId: row.subject_id,
    signal: row.signal,
    value: row.value_num ?? row.value_text ?? null,
    unit: row.unit,
    observedAt: row.observed_at.toISOString(),
    receivedAt: row.received_at.toISOString(),
    missionTime: row.mission_time ?? undefined,
    provenance: {
      type: row.provenance_type,
      source: row.provenance_source,
      ...(row.provenance_device ? { device: row.provenance_device } : {}),
      ...(row.provenance_dataset ? { dataset: row.provenance_dataset } : {}),
    },
    quality: {
      state: row.quality_state,
      ...(row.quality_reason ? { reason: row.quality_reason } : {}),
    },
    processingVersion: row.processing_version ?? undefined,
  });
}

export function createPostgresObservationsRepository(pool: Pool): ObservationsRepository {
  return {
    add: async (raw) => {
      const o = observationSchema.parse(raw);
      const inserted = await pool.query(
        `insert into observations (id, subject_id, signal, value_num, value_text, unit, observed_at,
           mission_time, provenance_type, provenance_source, provenance_device, provenance_dataset,
           quality_state, quality_reason, processing_version)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         on conflict (id) do nothing`,
        [
          o.id,
          o.subjectId,
          o.signal,
          typeof o.value === "number" ? o.value : null,
          typeof o.value === "string" ? o.value : null,
          o.unit,
          o.observedAt,
          o.missionTime ?? null,
          o.provenance.type,
          o.provenance.source,
          o.provenance.device ?? null,
          o.provenance.dataset ?? null,
          o.quality.state,
          o.quality.reason ?? null,
          o.processingVersion ?? null,
        ],
      );
      const { rows } = await pool.query<Row>("select * from observations where id = $1", [o.id]);
      return { observation: toObservation(rows[0]), duplicate: inserted.rowCount === 0 };
    },
    listBySubject: async (subjectId, options = {}) => {
      const limit = Math.min(Math.max(options.limit ?? 500, 1), 5000);
      const { rows } = await pool.query<Row>(
        `select * from observations
         where subject_id = $1
           and ($2::text is null or signal = $2)
           and ($3::timestamptz is null or observed_at >= $3)
         order by observed_at asc
         limit $4`,
        [subjectId, options.signal ?? null, options.since ?? null, limit],
      );
      return rows.map(toObservation);
    },
  };
}
