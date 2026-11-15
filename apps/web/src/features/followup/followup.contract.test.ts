import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildFollowUpContract } from "./followup.contract.ts";
import { followUpContractSchema } from "./followup.schema.ts";

const input = {
  subjectId: "cm-01",
  planStartedAt: "2026-11-18T00:00:00Z",
  baselineFrozenAt: "2026-11-11T00:00:00Z",
  targets: [{ signal: "hrv", expectedDirection: "increase" as const }],
};

describe("buildFollowUpContract", () => {
  it("builds consecutive three-day windows starting at the plan start", () => {
    const contract = buildFollowUpContract(input);
    assert.equal(contract.windows.length, 4);
    assert.deepEqual(
      contract.windows.map((w) => [w.start, w.end]),
      [
        ["2026-11-18T00:00:00Z", "2026-11-21T00:00:00Z"],
        ["2026-11-21T00:00:00Z", "2026-11-24T00:00:00Z"],
        ["2026-11-24T00:00:00Z", "2026-11-27T00:00:00Z"],
        ["2026-11-27T00:00:00Z", "2026-11-30T00:00:00Z"],
      ],
    );
  });

  it("takes the reference window from the days right before the plan start", () => {
    const { referenceWindow } = buildFollowUpContract(input);
    assert.deepEqual(referenceWindow, {
      start: "2026-11-15T00:00:00Z",
      end: "2026-11-18T00:00:00Z",
    });
  });

  it("records the plan start and the frozen baseline cutoff", () => {
    const contract = buildFollowUpContract(input);
    assert.equal(contract.planStartedAt, "2026-11-18T00:00:00Z");
    assert.equal(contract.baselineFrozenAt, "2026-11-11T00:00:00Z");
  });

  it("produces a contract that satisfies the schema and requires several windows", () => {
    const contract = buildFollowUpContract(input);
    assert.equal(followUpContractSchema.safeParse(contract).success, true);
    assert.ok(contract.hysteresis.consecutiveWindows >= 2);
  });

  it("rejects a hysteresis of a single window", () => {
    const contract = buildFollowUpContract(input);
    const broken = { ...contract, hysteresis: { consecutiveWindows: 1 } };
    assert.equal(followUpContractSchema.safeParse(broken).success, false);
  });

  it("rejects a baseline frozen after the plan start", () => {
    assert.throws(() =>
      buildFollowUpContract({ ...input, baselineFrozenAt: "2026-11-19T00:00:00Z" }),
    );
  });
});
