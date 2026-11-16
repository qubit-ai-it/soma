import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { createJsonStore, createSeedStore } from "./json-store.ts";

describe("json-store", () => {
  let root: string;
  let seedDir: string;
  let runtimeDir: string;

  before(async () => {
    root = await mkdtemp(path.join(tmpdir(), "soma-store-"));
    seedDir = path.join(root, "seed");
    runtimeDir = path.join(root, "runtime");
    await mkdir(seedDir);
    await writeFile(path.join(seedDir, "counter.json"), '{"count":0}');
  });

  after(() => rm(root, { recursive: true, force: true }));

  it("copies the seed to runtime on first read and leaves the seed untouched", async () => {
    const store = createJsonStore({ seedDir, runtimeDir });
    assert.deepEqual(await store.read("counter"), { count: 0 });
    await store.update("counter", () => ({ count: 5 }));
    assert.deepEqual(await store.read("counter"), { count: 5 });
    assert.equal(
      await readFile(path.join(seedDir, "counter.json"), "utf-8"),
      '{"count":0}',
    );
  });

  it("serializes concurrent read-modify-write cycles without losing updates", async () => {
    const store = createJsonStore({ seedDir, runtimeDir: path.join(root, "concurrent") });
    await Promise.all(
      Array.from({ length: 25 }, () =>
        store.update("counter", (current) => ({
          count: (current as { count: number }).count + 1,
        })),
      ),
    );
    assert.deepEqual(await store.read("counter"), { count: 25 });
  });

  it("leaves no temp files behind and keeps the file valid JSON", async () => {
    const dir = path.join(root, "tidy");
    const store = createJsonStore({ seedDir, runtimeDir: dir });
    await store.update("counter", () => ({ count: 1 }));
    assert.deepEqual(await readdir(dir), ["counter.json"]);
  });

  it("rejects names that could escape the data directory", async () => {
    const store = createJsonStore({ seedDir, runtimeDir });
    await assert.rejects(store.read("../secrets"), /Invalid store name/);
    await assert.rejects(store.update("a/b", () => ({})), /Invalid store name/);
  });

  it("keeps working after a failed update", async () => {
    const store = createJsonStore({ seedDir, runtimeDir: path.join(root, "recover") });
    await assert.rejects(
      store.update("counter", () => {
        throw new Error("boom");
      }),
      /boom/,
    );
    assert.deepEqual(await store.read("counter"), { count: 0 });
  });

  it("seed store reads the seed without creating any runtime directory", async () => {
    const store = createSeedStore(seedDir);
    assert.deepEqual(await store.read("counter"), { count: 0 });
    await assert.rejects(store.update("counter", () => ({ count: 1 })), /read-only/);
    await assert.rejects(store.read("../secrets"), /Invalid store name/);
  });
});
