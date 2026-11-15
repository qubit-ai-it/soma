import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GENESIS_HASH, appendEntry, exportAudit, verifyChain } from "./audit.logic.ts";
import type { AuditEntry, NewAuditEntry } from "./alerts.types.ts";

const T0 = "2026-10-31T06:00:00.000Z";

const raised: NewAuditEntry = {
  action: "alert_raised",
  actor: { kind: "system", id: "deterministic-engine" },
  alertId: "al-1",
  subjectId: "cm-02",
  detail: "F2",
};

function build(count: number): AuditEntry[] {
  let entries: AuditEntry[] = [];
  for (let i = 1; i <= count; i++) {
    entries = appendEntry(entries, { ...raised, alertId: `al-${i}` }, { id: `a-${i}`, at: T0 }).entries;
  }
  return entries;
}

describe("appendEntry", () => {
  it("assigns increasing seq and chains hashes from the genesis hash", () => {
    const entries = build(3);
    assert.deepEqual(
      entries.map((e) => e.seq),
      [1, 2, 3],
    );
    assert.equal(entries[0]?.prevHash, GENESIS_HASH);
    assert.equal(entries[1]?.prevHash, entries[0]?.hash);
    assert.equal(entries[2]?.prevHash, entries[1]?.hash);
    assert.match(entries[0]!.hash, /^[0-9a-f]{64}$/);
  });

  it("never changes entries that were already there", () => {
    const before = build(2);
    const snapshot = JSON.stringify(before);
    const after = appendEntry(before, raised, { id: "a-3", at: T0 }).entries;
    assert.equal(JSON.stringify(after.slice(0, 2)), snapshot);
    assert.equal(after.length, 3);
  });

  it("ignores a repeated idempotency key", () => {
    const first = appendEntry([], { ...raised, idempotencyKey: "k" }, { id: "a-1", at: T0 });
    const second = appendEntry(first.entries, { ...raised, idempotencyKey: "k" }, { id: "a-2", at: T0 });
    assert.equal(second.duplicate, true);
    assert.equal(second.entries.length, 1);
    assert.equal(second.entry.id, "a-1");
  });

  it("records the AI proposal next to the human decision", () => {
    const { entry } = appendEntry(
      [],
      {
        action: "plan_review",
        actor: { kind: "human", id: "demo-earth-md-01", role: "earth" },
        aiProposal: {
          proposalId: "pp-1",
          title: "Plan",
          steps: ["a"],
          provider: "simulated-medgemma",
          version: "sim-1",
        },
        humanDecision: { decision: "modify", steps: ["b"], note: "ajuste" },
      },
      { id: "a-1", at: T0 },
    );
    assert.equal(entry.aiProposal?.version, "sim-1");
    assert.deepEqual(entry.humanDecision?.steps, ["b"]);
  });
});

describe("verifyChain", () => {
  it("accepts an untouched chain and an empty one", () => {
    assert.deepEqual(verifyChain(build(4)), { valid: true });
    assert.deepEqual(verifyChain([]), { valid: true });
  });

  it("detects an edited entry", () => {
    const entries = build(3);
    entries[1] = { ...entries[1]!, detail: "tampered" };
    assert.deepEqual(verifyChain(entries), { valid: false, brokenAtSeq: 2 });
  });

  it("detects a removed entry", () => {
    const entries = build(3);
    entries.splice(1, 1);
    assert.deepEqual(verifyChain(entries), { valid: false, brokenAtSeq: 3 });
  });
});

describe("exportAudit", () => {
  it("serializes the entries with export metadata and chain status", () => {
    const entries = build(2);
    const parsed = JSON.parse(exportAudit(entries, T0));
    assert.equal(parsed.exportedAt, T0);
    assert.equal(parsed.count, 2);
    assert.equal(parsed.chainValid, true);
    assert.equal(parsed.entries.length, 2);
    assert.match(parsed.note, /hashes/i);
  });
});
