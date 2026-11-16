import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canOpenReport } from "./report-access.ts";

describe("canOpenReport", () => {
  it("lets an astronaut open only their own report", () => {
    assert.equal(canOpenReport({ role: "astronaut", memberId: "cm-aaaaaaaa" }, "cm-aaaaaaaa"), true);
    assert.equal(canOpenReport({ role: "astronaut", memberId: "cm-aaaaaaaa" }, "cm-bbbbbbbb"), false);
    assert.equal(canOpenReport({ role: "astronaut", memberId: null }, "cm-bbbbbbbb"), false);
  });

  it("keeps access for cmo, commander and earth", () => {
    for (const role of ["cmo", "commander", "earth"] as const) {
      assert.equal(canOpenReport({ role, memberId: null }, "cm-bbbbbbbb"), true);
    }
  });
});
