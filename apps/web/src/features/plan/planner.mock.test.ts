import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMockPlanner } from "./planner.mock.ts";
import type { CarePlanDraft, PlanInput } from "./planner.port.ts";

const input: PlanInput = { riskLevel: "high", concerns: ["SpO₂ baja"] };

async function draft(
  value: PlanInput,
  random: () => number,
): Promise<CarePlanDraft> {
  const result = await createMockPlanner({ random }).draft(value);
  assert.ok(result.ok);
  return result.value;
}

describe("simulated MedGemma planner", () => {
  it("varies its draft with the random source", async () => {
    const a = await draft(input, () => 0.01);
    const b = await draft(input, () => 0.99);
    assert.notDeepEqual(
      { steps: a.steps, uncertainty: a.uncertainty },
      { steps: b.steps, uncertainty: b.uncertainty },
    );
  });

  it("always requires human validation and states its uncertainty", async () => {
    for (const riskLevel of ["low", "moderate", "high"] as const) {
      const plan = await draft({ riskLevel, concerns: [] }, Math.random);
      assert.equal(plan.requiresHumanValidation, true);
      assert.ok(plan.uncertainty.length > 0);
      assert.ok(plan.steps.length >= 3);
      assert.equal(plan.source.mode, "mock");
      assert.equal(plan.source.provider, "simulated-medgemma");
    }
  });

  it("mentions the flagged concerns and never repeats a step", async () => {
    const plan = await draft(input, Math.random);
    assert.ok(plan.steps[0].includes("SpO₂ baja"));
    assert.equal(new Set(plan.steps).size, plan.steps.length);
  });
});
