import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createConversation,
  deriveTitle,
  MAX_CONVERSATIONS,
  NEW_CONVERSATION_TITLE,
  parseConversations,
  removeConversation,
  upsertConversation,
  withMessages,
} from "./chat.history.ts";

const greeting = { role: "assistant" as const, content: "hello" };

describe("deriveTitle", () => {
  it("falls back when there is no user message", () => {
    assert.equal(deriveTitle([greeting]), NEW_CONVERSATION_TITLE);
  });

  it("uses the first user message, truncated", () => {
    const long = "a".repeat(80);
    const title = deriveTitle([greeting, { role: "user", content: long }]);
    assert.equal(title.length, 48);
    assert.ok(title.endsWith("…"));
  });
});

describe("upsertConversation", () => {
  it("replaces by id and orders by recency", () => {
    const a = createConversation("a", 1, greeting);
    const b = createConversation("b", 2, greeting);
    const list = upsertConversation(upsertConversation([], a), b);
    assert.deepEqual(list.map((c) => c.id), ["b", "a"]);
    const updated = upsertConversation(list, withMessages(a, [greeting, { role: "user", content: "x" }], 3));
    assert.deepEqual(updated.map((c) => c.id), ["a", "b"]);
    assert.equal(updated[0].title, "x");
  });

  it("strips image data and keeps the count", () => {
    const c = withMessages(createConversation("a", 1, greeting), [
      { role: "user", content: "look", images: ["data:image/jpeg;base64,AAAA"] },
    ], 2);
    const [stored] = upsertConversation([], c);
    assert.equal(stored.messages[0].images, undefined);
    assert.equal(stored.messages[0].imageCount, 1);
  });

  it("caps the list length", () => {
    let list = [] as ReturnType<typeof upsertConversation>;
    for (let i = 0; i < MAX_CONVERSATIONS + 5; i++) {
      list = upsertConversation(list, createConversation(String(i), i, greeting));
    }
    assert.equal(list.length, MAX_CONVERSATIONS);
    assert.equal(list[0].id, String(MAX_CONVERSATIONS + 4));
  });
});

describe("removeConversation and parseConversations", () => {
  it("removes by id", () => {
    const list = upsertConversation([], createConversation("a", 1, greeting));
    assert.deepEqual(removeConversation(list, "a"), []);
  });

  it("drops malformed entries", () => {
    assert.deepEqual(parseConversations("x"), []);
    assert.deepEqual(parseConversations([{ id: 1 }, null]), []);
  });
});
