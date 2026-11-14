import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hexToRgb, SENTRY_DEFAULT_COLOR, SENTRY_PALETTE } from "./pet.types.ts";

describe("hexToRgb", () => {
  it("parses the default Sentry color", () => {
    assert.deepEqual(hexToRgb(SENTRY_DEFAULT_COLOR), [7, 78, 234]);
  });

  it("rejects malformed values", () => {
    assert.equal(hexToRgb("074EEA"), null);
    assert.equal(hexToRgb("#fff"), null);
  });

  it("parses every palette entry", () => {
    for (const { value } of SENTRY_PALETTE) assert.notEqual(hexToRgb(value), null);
  });
});
