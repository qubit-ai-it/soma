import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { procedureFileSchema, procedureSchema } from "./procedure.schema.ts";

const step = { id: "s1", title: "Prepare", instruction: "Prepare the equipment." };
const procedure = { id: "p1", title: "Demo procedure", steps: [step] };

describe("procedure schema", () => {
  it("accepts a valid procedure and defaults optional to false", () => {
    const parsed = procedureSchema.parse(procedure);
    assert.equal(parsed.steps[0].optional, false);
  });

  it("rejects a procedure without steps", () => {
    assert.equal(procedureSchema.safeParse({ ...procedure, steps: [] }).success, false);
  });

  it("rejects duplicate step ids", () => {
    const dup = { ...procedure, steps: [step, { ...step, title: "Again" }] };
    assert.equal(procedureSchema.safeParse(dup).success, false);
  });

  it("rejects a step without instruction", () => {
    const bad = { ...procedure, steps: [{ id: "s1", title: "Prepare", instruction: "" }] };
    assert.equal(procedureSchema.safeParse(bad).success, false);
  });
});

describe("procedure file schema", () => {
  it("accepts a list of procedures", () => {
    assert.ok(procedureFileSchema.safeParse({ procedures: [procedure] }).success);
  });

  it("rejects duplicate procedure ids", () => {
    assert.equal(
      procedureFileSchema.safeParse({ procedures: [procedure, procedure] }).success,
      false,
    );
  });
});
