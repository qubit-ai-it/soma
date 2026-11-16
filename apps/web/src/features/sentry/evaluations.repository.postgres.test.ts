import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import type { Pool } from "pg";

import { createTestSchema, hasDirectDatabase } from "../../server/postgres.testing.ts";
import type { Evaluation, Status } from "../rules/rules.types.ts";
import { createPostgresEvaluationsRepository } from "./evaluations.repository.postgres.ts";

const evaluation = (status: Status, at: string, subjectId = "cm-02"): Evaluation => ({
  status,
  subjectId,
  evaluatedAt: at,
  ruleSetVersion: "live-0.1.0",
  engineVersion: "0.1.0",
  triggeredRules: status === "F0" ? [] : ["hr-high"],
  evidence: [],
  limitations: [],
});

describe("postgres evaluations repository", { skip: !hasDirectDatabase }, () => {
  let pool: Pool;
  let drop: () => Promise<void>;
  before(async () => {
    ({ pool, drop } = await createTestSchema());
  });
  after(async () => {
    await drop();
  });

  it("saves only when the level changes", async () => {
    const repo = createPostgresEvaluationsRepository(pool);
    const a = await repo.saveIfChanged(evaluation("F0", "2026-11-16T10:00:00.000Z"));
    const b = await repo.saveIfChanged(evaluation("F0", "2026-11-16T10:01:00.000Z"));
    const c = await repo.saveIfChanged(evaluation("F2", "2026-11-16T10:02:00.000Z"));
    assert.deepEqual([a.saved, b.saved, c.saved], [true, false, true]);
    assert.equal(c.previous?.status, "F0");
    assert.equal(c.history.length, 1);
    assert.equal((await repo.latest("cm-02"))?.status, "F2");
    assert.equal((await repo.history("cm-02")).length, 2);
  });

  it("ignores an older evaluation and keeps subjects apart", async () => {
    const repo = createPostgresEvaluationsRepository(pool);
    const stale = await repo.saveIfChanged(evaluation("F3", "2026-11-16T09:00:00.000Z"));
    assert.equal(stale.saved, false);
    const other = await repo.saveIfChanged(evaluation("F1", "2026-11-16T10:00:00.000Z", "cm-03"));
    assert.equal(other.saved, true);
    assert.equal((await repo.latest("cm-03"))?.status, "F1");
    assert.equal((await repo.latest("nobody")), null);
  });

  it("round-trips triggered rules and evidence", async () => {
    const repo = createPostgresEvaluationsRepository(pool);
    await repo.saveIfChanged({
      ...evaluation("F3", "2026-11-16T11:00:00.000Z", "cm-04"),
      evidence: [{ kind: "convergence", ruleId: "conv-3", level: "F2", signals: ["hrv", "sleepHours", "fatigue"] }],
      limitations: ["no-recent-observations:hrv"],
    });
    const stored = await repo.latest("cm-04");
    assert.deepEqual(stored?.triggeredRules, ["hr-high"]);
    assert.deepEqual(stored?.limitations, ["no-recent-observations:hrv"]);
    assert.equal(stored?.evidence[0].kind, "convergence");
  });
});
