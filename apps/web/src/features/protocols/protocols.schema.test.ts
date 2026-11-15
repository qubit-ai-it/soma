import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { protocolLibrarySchema } from "./protocols.schema.ts";

const seed = JSON.parse(
  readFileSync(new URL("../../../data/seed/protocols.json", import.meta.url), "utf-8"),
);

describe("protocol library seed", () => {
  const library = protocolLibrarySchema.parse(seed);

  it("holds four to five protocols with unique ids", () => {
    assert.ok(library.protocols.length >= 4 && library.protocols.length <= 5);
    const ids = library.protocols.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("declares every protocol as demonstration content with approval metadata", () => {
    for (const p of library.protocols) {
      assert.equal(p.approval.demonstration, true);
      assert.ok(p.approval.approvedBy.length > 0);
      assert.ok(p.approval.version.length > 0);
      assert.ok(!Number.isNaN(Date.parse(p.approval.approvedAt)));
      assert.ok(p.steps.length >= 2);
    }
  });

  it("rejects a protocol without approval metadata", () => {
    const broken = structuredClone(seed);
    delete broken.protocols[0].approval;
    assert.equal(protocolLibrarySchema.safeParse(broken).success, false);
  });

  it("rejects an approval not flagged as demonstration", () => {
    const broken = structuredClone(seed);
    broken.protocols[0].approval.demonstration = false;
    assert.equal(protocolLibrarySchema.safeParse(broken).success, false);
  });

  it("rejects duplicate protocol ids", () => {
    const broken = structuredClone(seed);
    broken.protocols[1].id = broken.protocols[0].id;
    assert.equal(protocolLibrarySchema.safeParse(broken).success, false);
  });

  it("only references rule ids of the demo rule set", () => {
    const known = new Set([
      "sleep-low",
      "hrv-low",
      "hrv-low-persistent",
      "fatigue-high",
      "heart-rate-high",
      "conv-3",
    ]);
    for (const p of library.protocols) {
      for (const r of p.triggers.ruleIds) assert.ok(known.has(r), r);
    }
  });
});
