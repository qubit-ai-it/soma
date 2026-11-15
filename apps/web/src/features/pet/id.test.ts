import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { newId } from "./id.ts";

describe("newId", () => {
  it("returns distinct ids", () => {
    assert.notEqual(newId(), newId());
  });

  it("falls back when randomUUID is unavailable (insecure context)", () => {
    const original = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      assert.match(newId(), /^[0-9a-f]{32}$/);
    } finally {
      Object.defineProperty(globalThis.crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});
