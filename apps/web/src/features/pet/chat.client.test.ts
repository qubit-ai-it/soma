import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMiniMaxChat, MAX_HISTORY_MESSAGES } from "./chat.client.ts";

const base = { apiKey: "test-key", baseUrl: "https://example.test/v1/", model: "m" };

function fakeFetch(respond: () => Response, calls: { url: string; init: RequestInit }[] = []) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return respond();
  }) as typeof fetch;
}

describe("createMiniMaxChat", () => {
  it("posts to chat/completions with bearer auth and returns the reply", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const chat = createMiniMaxChat({
      ...base,
      fetch: fakeFetch(
        () => Response.json({ choices: [{ message: { content: " hola " } }] }),
        calls,
      ),
    });
    const result = await chat.reply([{ role: "user", content: "hi" }]);
    assert.deepEqual(result, { ok: true, value: "hola" });
    assert.equal(calls[0].url, "https://example.test/v1/chat/completions");
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers.authorization, "Bearer test-key");
    const body = JSON.parse(calls[0].init.body as string);
    assert.equal(body.messages[0].role, "system");
    assert.equal(body.messages.at(-1).content, "hi");
  });

  it("keeps only the latest history messages", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const chat = createMiniMaxChat({
      ...base,
      fetch: fakeFetch(() => Response.json({ choices: [{ message: { content: "x" } }] }), calls),
    });
    const history = Array.from({ length: MAX_HISTORY_MESSAGES + 5 }, (_, i) => ({
      role: "user" as const,
      content: String(i),
    }));
    await chat.reply(history);
    const body = JSON.parse(calls[0].init.body as string);
    assert.equal(body.messages.length, MAX_HISTORY_MESSAGES + 1);
  });

  it("returns an error on a non-2xx status", async () => {
    const chat = createMiniMaxChat({ ...base, fetch: fakeFetch(() => new Response("no", { status: 401 })) });
    const result = await chat.reply([{ role: "user", content: "hi" }]);
    assert.equal(result.ok, false);
  });

  it("returns an error when the reply is empty", async () => {
    const chat = createMiniMaxChat({
      ...base,
      fetch: fakeFetch(() => Response.json({ choices: [{ message: { content: "  " } }] })),
    });
    assert.equal((await chat.reply([{ role: "user", content: "hi" }])).ok, false);
  });

  it("returns an error when fetch throws", async () => {
    const chat = createMiniMaxChat({
      ...base,
      fetch: (async () => {
        throw new Error("down");
      }) as typeof fetch,
    });
    assert.equal((await chat.reply([{ role: "user", content: "hi" }])).ok, false);
  });
});
