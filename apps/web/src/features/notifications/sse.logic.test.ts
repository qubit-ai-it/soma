import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatEvent, parseCursor } from "./sse.logic.ts";

describe("sse helpers", () => {
  it("formats an event with id, name and single-line json data", () => {
    assert.equal(
      formatEvent({ id: 7, event: "notification", data: { title: "a\nb" } }),
      'id: 7\nevent: notification\ndata: {"title":"a\\nb"}\n\n',
    );
  });

  it("prefers the Last-Event-ID header over the query cursor", () => {
    assert.equal(parseCursor("12", "3"), 12);
    assert.equal(parseCursor(null, "3"), 3);
  });

  it("ignores empty or invalid cursors", () => {
    assert.equal(parseCursor(null, null), undefined);
    assert.equal(parseCursor("", "  "), undefined);
    assert.equal(parseCursor("abc", "-4"), undefined);
    assert.equal(parseCursor("abc", "5"), 5);
  });
});
