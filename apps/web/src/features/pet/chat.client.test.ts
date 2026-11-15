import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createOllamaChat, MAX_HISTORY_MESSAGES } from "./chat.client.ts";

const base = {
  url: "https://example.ngrok-free.dev/api/chat",
  model: "medgemma:27b",
};

type Call = { url: string; init: RequestInit };

function fakeFetch(respond: () => Response, calls: Call[] = []) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return respond();
  }) as typeof fetch;
}

const okBody = (content: string) => Response.json({ message: { content } });

describe("createOllamaChat", () => {
  it("posts to the configured Ollama endpoint and returns the non-streamed reply", async () => {
    const calls: Call[] = [];
    const chat = createOllamaChat({ ...base, fetch: fakeFetch(() => okBody(" hola "), calls) });
    const result = await chat.reply([{ role: "user", content: "hi" }]);
    assert.deepEqual(result, { ok: true, value: "hola" });
    assert.equal(calls[0].url, base.url);
    assert.equal(calls[0].init.method, "POST");
    const headers = new Headers(calls[0].init.headers);
    assert.equal(headers.get("content-type"), "application/json");
    assert.equal(headers.get("ngrok-skip-browser-warning"), "1");
    assert.equal(headers.get("authorization"), null);
    const body = JSON.parse(calls[0].init.body as string);
    assert.equal(body.model, base.model);
    assert.equal(body.stream, false);
    assert.equal(body.messages[0].role, "system");
    assert.match(body.messages[0].content, /Sentry/);
    assert.deepEqual(body.messages.slice(1), [{ role: "user", content: "hi" }]);
  });

  it("sends the configured authorization header to a protected tunnel", async () => {
    const calls: Call[] = [];
    const authorization = "Basic dXNlcjpwYXNzd29yZA==";
    const chat = createOllamaChat({
      ...base,
      authorization,
      fetch: fakeFetch(() => okBody("x"), calls),
    });
    await chat.reply([{ role: "user", content: "hi" }]);
    assert.equal(new Headers(calls[0].init.headers).get("authorization"), authorization);
  });

  it("keeps the latest messages starting with a user turn and preserves assistant roles", async () => {
    const calls: Call[] = [];
    const chat = createOllamaChat({ ...base, fetch: fakeFetch(() => okBody("x"), calls) });
    const history = Array.from({ length: MAX_HISTORY_MESSAGES + 5 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: String(i),
    }));
    await chat.reply(history);
    const { messages } = JSON.parse(calls[0].init.body as string);
    assert.deepEqual(messages.slice(1), history.slice(6));
  });

  it("sends base64 images from the last user turn", async () => {
    const calls: Call[] = [];
    const chat = createOllamaChat({ ...base, fetch: fakeFetch(() => okBody("x"), calls) });
    await chat.reply([
      { role: "user", content: "old", images: ["data:image/jpeg;base64,b2xk"] },
      { role: "assistant", content: "ok" },
      { role: "user", content: "new", images: ["data:image/png;base64,bmV3"] },
    ]);
    const { messages } = JSON.parse(calls[0].init.body as string);
    assert.deepEqual(messages.slice(1), [
      { role: "user", content: "old" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "new", images: ["bmV3"] },
    ]);
  });

  it("reports a non-2xx status without exposing the upstream response body", async () => {
    const chat = createOllamaChat({
      ...base,
      fetch: fakeFetch(() => new Response("private", { status: 401 })),
    });
    const result = await chat.reply([{ role: "user", content: "hi" }]);
    assert.deepEqual(result, { ok: false, error: "Ollama answered HTTP 401" });
  });

  it("returns an error when the reply is empty", async () => {
    const chat = createOllamaChat({ ...base, fetch: fakeFetch(() => okBody("  ")) });
    assert.equal((await chat.reply([{ role: "user", content: "hi" }])).ok, false);
  });

  it("returns an error when fetch throws", async () => {
    const chat = createOllamaChat({
      ...base,
      fetch: (async () => {
        throw new Error("down");
      }) as typeof fetch,
    });
    assert.equal((await chat.reply([{ role: "user", content: "hi" }])).ok, false);
  });
});
