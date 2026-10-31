import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { err, ok } from "../../shared/result.ts";
import { mockSource } from "../../shared/source.ts";
import { createFallbackPlanner } from "./planner.chain.ts";
import type { CarePlanner, PlanInput } from "./planner.port.ts";

const input: PlanInput = { riskLevel: "low", concerns: [] };

function planner(provider: string | null): CarePlanner & { calls: number } {
  const self = {
    calls: 0,
    async draft() {
      self.calls++;
      return provider
        ? ok({
            steps: ["a", "b", "c"],
            uncertainty: "u",
            requiresHumanValidation: true as const,
            source: mockSource(provider),
          })
        : err("down");
    },
  };
  return self;
}

describe("fallback planner", () => {
  it("returns the first plan that works and skips the rest", async () => {
    const first = planner("first");
    const second = planner("second");
    const result = await createFallbackPlanner([first, second]).draft(input);
    assert.ok(result.ok);
    assert.equal(result.value.source.provider, "first");
    assert.equal(second.calls, 0);
  });

  it("falls back when the first planner fails", async () => {
    const result = await createFallbackPlanner([planner(null), planner("fixture")]).draft(input);
    assert.ok(result.ok);
    assert.equal(result.value.source.provider, "fixture");
  });

  it("reports every failure when all planners fail", async () => {
    const result = await createFallbackPlanner([planner(null), planner(null)]).draft(input);
    assert.ok(!result.ok);
    assert.ok(result.error.includes("down; down"));
  });
});
