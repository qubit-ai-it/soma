import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONFIRMATION_BANNER,
  CONFIRMATION_LINE,
  describeReason,
  describeStatus,
} from "./followup.display.ts";

describe("follow-up labels", () => {
  it("names each status in English with words, not only color", () => {
    assert.equal(describeStatus("improving"), "Improving");
    assert.equal(describeStatus("stable"), "Stable");
    assert.equal(describeStatus("worsening"), "Worsening");
    assert.equal(describeStatus("not-evaluable"), "Not evaluable");
  });

  it("explains every reason a window is not evaluable", () => {
    for (const reason of [
      "baseline-insufficient",
      "no-reference-deviation",
      "data-quality",
      "adherence-missing",
      "adherence-low",
      "adherence-changed",
    ] as const) {
      assert.ok(describeReason(reason).length > 10);
    }
  });

  it("states that improvement needs human confirmation to step the status down", () => {
    assert.match(CONFIRMATION_BANNER, /lowering the status/i);
    assert.match(CONFIRMATION_BANNER, /human confirmation/i);
    assert.match(CONFIRMATION_LINE, /never automatic/i);
  });
});
