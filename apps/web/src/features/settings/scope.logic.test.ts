import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scopedKey } from "./scope.logic.ts";

describe("scopedKey", () => {
  it("keeps two users apart", () => {
    assert.notEqual(scopedKey("soma.pet.runs", "user_a"), scopedKey("soma.pet.runs", "user_b"));
    assert.equal(scopedKey("soma.pet.runs", "user_a"), "soma.pet.runs:user_a");
  });

  it("falls back to the guest scope when empty", () => {
    assert.equal(scopedKey("soma.settings.v1", ""), "soma.settings.v1:guest");
  });
});
