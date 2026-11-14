import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fitWithin } from "./image.ts";

describe("fitWithin", () => {
  it("keeps small images as they are", () => {
    assert.deepEqual(fitWithin(300, 200, 1024), { width: 300, height: 200 });
  });

  it("scales the longest side down to the limit", () => {
    assert.deepEqual(fitWithin(2048, 1024, 1024), { width: 1024, height: 512 });
    assert.deepEqual(fitWithin(500, 2000, 1000), { width: 250, height: 1000 });
  });
});
