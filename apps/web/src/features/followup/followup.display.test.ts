import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONFIRMATION_BANNER,
  CONFIRMATION_LINE,
  describeReason,
  describeStatus,
} from "./followup.display.ts";

describe("follow-up labels", () => {
  it("names each status in Spanish with words, not only color", () => {
    assert.equal(describeStatus("improving"), "Mejora");
    assert.equal(describeStatus("stable"), "Estable");
    assert.equal(describeStatus("worsening"), "Empeora");
    assert.equal(describeStatus("not-evaluable"), "No evaluable");
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
    assert.match(CONFIRMATION_BANNER, /bajar de estado/i);
    assert.match(CONFIRMATION_BANNER, /confirmaci[oó]n humana/i);
    assert.match(CONFIRMATION_LINE, /nunca es autom[aá]tico/i);
  });
});
