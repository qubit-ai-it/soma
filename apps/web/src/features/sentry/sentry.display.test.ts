import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generatedBy, timeAgo } from "./sentry.display.ts";

const NOW = Date.parse("2026-11-16T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("timeAgo", () => {
  it("covers moment, minutes, hours and days", () => {
    assert.equal(timeAgo(ago(10_000), NOW), "hace un momento");
    assert.equal(timeAgo(ago(3 * 60_000), NOW), "hace 3 min");
    assert.equal(timeAgo(ago(2 * 3_600_000), NOW), "hace 2 h");
    assert.equal(timeAgo(ago(3 * 86_400_000), NOW), "hace 3 d");
  });

  it("never goes negative for a future timestamp", () => {
    assert.equal(timeAgo(ago(-60_000), NOW), "hace un momento");
  });

  it("labels the author", () => {
    assert.equal(generatedBy(ago(5 * 60_000), NOW), "Generado por Sentry · hace 5 min");
  });
});
