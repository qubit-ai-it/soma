import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { plannerOutputJsonSchema, plannerOutputSchema } from "./planner.schema.ts";

const valid = {
  steps: ["Rest.", "Repeat measurements.", "Notify the flight surgeon."],
  uncertainty: "Draft based only on three flagged signals.",
};

describe("planner output schema", () => {
  it("accepts a well-formed draft", () => {
    assert.ok(plannerOutputSchema.safeParse(valid).success);
  });

  it("rejects responses that do not meet the schema", () => {
    const invalid: unknown[] = [
      null,
      "text",
      {},
      { steps: valid.steps },
      { uncertainty: valid.uncertainty },
      { ...valid, steps: ["only one", "two"] },
      { ...valid, steps: ["ok", "ok too", ""] },
      { ...valid, steps: ["ok", "ok too", 3] },
      { ...valid, steps: Array.from({ length: 9 }, (_, i) => `step ${i}`) },
      { ...valid, uncertainty: "" },
      { ...valid, uncertainty: 0.4 },
    ];
    for (const value of invalid) {
      assert.equal(plannerOutputSchema.safeParse(value).success, false);
    }
  });

  it("exposes a JSON schema for the Ollama format field", () => {
    const schema = plannerOutputJsonSchema as Record<string, unknown>;
    assert.equal(schema.type, "object");
    assert.deepEqual(schema.required, ["steps", "uncertainty"]);
    assert.equal("$schema" in schema, false);
  });
});
