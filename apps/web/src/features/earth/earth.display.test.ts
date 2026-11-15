import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { errorLabel, formatTime } from "./earth.display.ts";

describe("earth display helpers", () => {
  it("formats an ISO timestamp as UTC time", () => {
    assert.equal(formatTime("2026-10-31T06:05:09.000Z"), "06:05:09 UTC");
  });

  it("translates known error codes and passes unknown ones through", () => {
    assert.equal(errorLabel("link_down"), "Sin enlace");
    assert.equal(errorLabel("ack_lost"), "Confirmación perdida");
    assert.equal(errorLabel("weird"), "weird");
    assert.equal(errorLabel(undefined), undefined);
  });
});
