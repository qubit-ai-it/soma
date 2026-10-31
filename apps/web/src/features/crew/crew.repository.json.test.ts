import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { createJsonStore } from "../../server/json-store.ts";
import { createJsonCrewRepository } from "./crew.repository.json.ts";

const member = {
  id: "cm-01",
  name: "Test Member",
  role: "Tester",
  vitals: { heartRateBpm: 70, spo2Pct: 98, sleepHours: 7 },
  cumulativeDoseMsv: 20,
  lastCheckIn: "2026-10-31T06:00:00Z",
};

describe("json crew repository", () => {
  let root: string;
  let seedDir: string;

  before(async () => {
    root = await mkdtemp(path.join(tmpdir(), "soma-crew-"));
    seedDir = path.join(root, "seed");
    await mkdir(seedDir);
    await writeFile(path.join(seedDir, "crew.json"), JSON.stringify({ crew: [member] }));
  });

  after(() => rm(root, { recursive: true, force: true }));

  it("lists and gets members through the store", async () => {
    const repo = createJsonCrewRepository(
      createJsonStore({ seedDir, runtimeDir: path.join(root, "ok") }),
    );
    assert.deepEqual(await repo.list(), [member]);
    assert.deepEqual(await repo.get("cm-01"), member);
    assert.equal(await repo.get("missing"), null);
  });

  it("rejects data that does not match the schema", async () => {
    const runtimeDir = path.join(root, "bad");
    await mkdir(runtimeDir);
    await writeFile(
      path.join(runtimeDir, "crew.json"),
      JSON.stringify({ crew: [{ ...member, vitals: { heartRateBpm: -1, spo2Pct: 98, sleepHours: 7 } }] }),
    );
    const repo = createJsonCrewRepository(createJsonStore({ seedDir, runtimeDir }));
    await assert.rejects(repo.list());
  });
});
