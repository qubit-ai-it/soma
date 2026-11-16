import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { boardActions } from "./plan.status.ts";

describe("board actions", () => {
  it("offers submit for a draft or after requested changes", () => {
    assert.equal(boardActions("draft", "connected").submit, true);
    assert.equal(boardActions("changes_requested", "connected").submit, true);
    assert.equal(boardActions("in_review", "connected").submit, false);
    assert.equal(boardActions("approved", "connected").submit, false);
  });

  it("offers board approval only without a link and while the plan is open", () => {
    assert.equal(boardActions("draft", "connected").approve, false);
    assert.equal(boardActions("draft", "disconnected").approve, true);
    assert.equal(boardActions("in_review", "disconnected").approve, true);
    assert.equal(boardActions("approved", "disconnected").approve, false);
  });

  it("explains who decides", () => {
    assert.equal(boardActions("in_review", "connected").note, "Esperando a Tierra.");
    assert.equal(boardActions("draft", "disconnected").note, "Sin enlace decide el médico de a bordo.");
    assert.equal(boardActions("approved", "disconnected").note, null);
    assert.equal(boardActions("draft", "connected").note, null);
  });
});
