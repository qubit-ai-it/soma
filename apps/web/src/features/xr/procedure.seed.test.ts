import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { completeStep, skipStep, startSession } from "./procedure.machine.ts";
import { procedureFileSchema } from "./procedure.schema.ts";
import type { SessionState } from "./procedure.types.ts";

const raw = JSON.parse(
  readFileSync(new URL("../../../data/seed/procedures.json", import.meta.url), "utf8"),
);

describe("procedure seed", () => {
  const { procedures } = procedureFileSchema.parse(raw);

  it("contains the guided ultrasound demo procedure", () => {
    assert.ok(procedures.some((p) => p.id === "ultrasound-capture-demo"));
  });

  it("gives every step a title and an instruction", () => {
    for (const procedure of procedures) {
      for (const step of procedure.steps) {
        assert.ok(step.title.length > 0 && step.instruction.length > 0);
      }
    }
  });

  it("can be walked from start to completion in practice mode", () => {
    for (const procedure of procedures) {
      let state: SessionState = startSession(procedure, "practice", "2026-11-15T10:00:00Z");
      while (state.phase === "in-progress") {
        const step = procedure.steps[state.currentIndex];
        const result = step.optional
          ? skipStep(procedure, state, "2026-11-15T10:01:00Z")
          : completeStep(procedure, state, "2026-11-15T10:01:00Z");
        assert.ok(result.ok);
        state = result.value;
      }
      assert.equal(state.phase, "completed");
    }
  });
});
