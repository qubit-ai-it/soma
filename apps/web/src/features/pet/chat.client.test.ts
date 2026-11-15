import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createGeminiChat, MAX_HISTORY_MESSAGES } from "./chat.client.ts";

const base = { apiKey: "test-key", baseUrl: "https://example.test/v1beta/", model: "m" };

type Call = { url: string; init: RequestInit };

function fakeFetch(respond: () => Response, calls: Call[] = []) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return respond();
  }) as typeof fetch;
}

const okBody = (text: string) =>
  Response.json({ candidates: [{ content: { parts: [{ text }] } }] });

describe("createGeminiChat", () => {
  it("posts to generateContent with the x-goog-api-key header and returns the reply", async () => {
    const calls: Call[] = [];
    const chat = createGeminiChat({ ...base, fetch: fakeFetch(() => okBody(" hola "), calls) });
    const result = await chat.reply([{ role: "user", content: "hi" }]);
    assert.deepEqual(result, { ok: true, value: "hola" });
    assert.equal(calls[0].url, "https://example.test/v1beta/models/m:generateContent");
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers["x-goog-api-key"], "test-key");
    assert.equal(headers.authorization, undefined);
    const body = JSON.parse(calls[0].init.body as string);
    assert.ok(body.systemInstruction.parts[0].text.includes("Sentry"));
    assert.deepEqual(body.contents, [{ role: "user", parts: [{ text: "hi" }] }]);
  });

  it("ignores a legacy /openai suffix in the base URL", async () => {
    const calls: Call[] = [];
    const chat = createGeminiChat({
      ...base,
      baseUrl: "https://example.test/v1beta/openai",
      fetch: fakeFetch(() => okBody("x"), calls),
    });
    await chat.reply([{ role: "user", content: "hi" }]);
    assert.equal(calls[0].url, "https://example.test/v1beta/models/m:generateContent");
  });

  it("maps assistant to model and keeps only the latest messages, starting on a user turn", async () => {
    const calls: Call[] = [];
    const chat = createGeminiChat({ ...base, fetch: fakeFetch(() => okBody("x"), calls) });
    const history = Array.from({ length: MAX_HISTORY_MESSAGES + 5 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: String(i),
    }));
    await chat.reply(history);
    const { contents } = JSON.parse(calls[0].init.body as string);
    assert.equal(contents[0].role, "user");
    assert.ok(contents.length <= MAX_HISTORY_MESSAGES);
    assert.ok(contents.some((c: { role: string }) => c.role === "model"));
  });

  it("sends images of the last message as inlineData parts only", async () => {
    const calls: Call[] = [];
    const chat = createGeminiChat({ ...base, fetch: fakeFetch(() => okBody("x"), calls) });
    await chat.reply([
      { role: "user", content: "old", images: ["data:image/jpeg;base64,OLD"] },
      { role: "assistant", content: "ok" },
      { role: "user", content: "new", images: ["data:image/png;base64,NEW"] },
    ]);
    const { contents } = JSON.parse(calls[0].init.body as string);
    assert.deepEqual(contents[0].parts, [{ text: "old" }]);
    assert.deepEqual(contents[2].parts, [
      { text: "new" },
      { inlineData: { mimeType: "image/png", data: "NEW" } },
    ]);
  });

  it("returns an error on a non-2xx status", async () => {
    const chat = createGeminiChat({ ...base, fetch: fakeFetch(() => new Response("no", { status: 401 })) });
    const result = await chat.reply([{ role: "user", content: "hi" }]);
    assert.equal(result.ok, false);
  });

  it("returns an error when the reply is empty", async () => {
    const chat = createGeminiChat({ ...base, fetch: fakeFetch(() => okBody("  ")) });
    assert.equal((await chat.reply([{ role: "user", content: "hi" }])).ok, false);
  });

  it("returns an error when fetch throws", async () => {
    const chat = createGeminiChat({
      ...base,
      fetch: (async () => {
        throw new Error("down");
      }) as typeof fetch,
    });
    assert.equal((await chat.reply([{ role: "user", content: "hi" }])).ok, false);
  });
});
