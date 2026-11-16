import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";

import { hasDatabase, testPool } from "../../server/postgres.testing.ts";
import { createPostgresObservationsRepository } from "./observation.repository.postgres.ts";
import { observationSchema } from "./observation.schema.ts";

describe("postgres observations repository", { skip: !hasDatabase }, () => {
  const pool = testPool();
  const repo = createPostgresObservationsRepository(pool);
  const subject = `test-${randomUUID()}`;

  after(async () => {
    await pool.query("delete from observations where subject_id = $1", [subject]);
    await pool.end();
  });

  const make = (id: string, at: string, value: number | null, valid = true) =>
    observationSchema.parse({
      id: `${subject}-${id}`,
      subjectId: subject,
      signal: "heartRate",
      value,
      unit: "bpm",
      observedAt: at,
      provenance: { type: "real", source: "Web Bluetooth", device: "watch" },
      quality: valid ? { state: "valid" } : { state: "missing", reason: "sensor-disconnected" },
    });

  it("stores provenance and quality, and is idempotent by id", async () => {
    const obs = make("1", "2026-11-15T10:00:00.000Z", 72);
    const first = await repo.add(obs);
    const second = await repo.add(obs);
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.deepEqual(first.observation.provenance, obs.provenance);
    assert.equal(first.observation.value, 72);
  });

  it("keeps a missing value as null, never zero", async () => {
    const { observation } = await repo.add(make("2", "2026-11-15T10:00:05.000Z", null, false));
    assert.equal(observation.value, null);
    assert.equal(observation.quality.state, "missing");
  });

  it("lists in time order with since and signal filters", async () => {
    await repo.add(make("3", "2026-11-15T10:00:10.000Z", 75));
    const all = await repo.listBySubject(subject, { signal: "heartRate" });
    assert.deepEqual(all.map((o) => o.id.slice(-1)), ["1", "2", "3"]);
    const recent = await repo.listBySubject(subject, { since: "2026-11-15T10:00:06.000Z" });
    assert.deepEqual(recent.map((o) => o.id.slice(-1)), ["3"]);
    assert.deepEqual(await repo.listBySubject(subject, { signal: "spo2" }), []);
  });
});
