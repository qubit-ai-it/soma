import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { requestGeminiJson } from "./gemini-chat.ts";

const connection = { apiKey: "k", model: "gemini-test", timeoutMs: 1000 };
const request = { system: "sys", user: "usr", schema: { type: "object" } };

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("requestGeminiJson", () => {
  it("sends the key in a header, the model in the path and asks for JSON", async () => {
    let seen: { url: string; headers: Record<string, string>; body: any } | null = null;
    const result = await requestGeminiJson(
      {
        ...connection,
        fetch: (async (url: string, init: RequestInit) => {
          seen = { url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) };
          return reply(200, { candidates: [{ content: { parts: [{ text: ' {"ok":true} ' }] } }] });
        }) as unknown as typeof fetch,
      },
      request,
    );
    assert.deepEqual(result, { ok: true, value: '{"ok":true}' });
    assert.ok(seen!.url.endsWith("/gemini-test:generateContent"));
    assert.equal(seen!.url.includes("key="), false);
    assert.equal(seen!.headers["x-goog-api-key"], "k");
    assert.equal(seen!.body.generationConfig.responseMimeType, "application/json");
    assert.deepEqual(seen!.body.generationConfig.responseJsonSchema, { type: "object" });
    assert.equal(seen!.body.systemInstruction.parts[0].text, "sys");
  });

  it("retries once without the schema when Gemini rejects it", async () => {
    const bodies: any[] = [];
    const result = await requestGeminiJson(
      {
        ...connection,
        fetch: (async (_url: string, init: RequestInit) => {
          bodies.push(JSON.parse(init.body as string));
          return bodies.length === 1
            ? reply(400, { error: "schema" })
            : reply(200, { candidates: [{ content: { parts: [{ text: "{}" }] } }] });
        }) as unknown as typeof fetch,
      },
      request,
    );
    assert.equal(result.ok, true);
    assert.equal(bodies.length, 2);
    assert.equal("responseJsonSchema" in bodies[1].generationConfig, false);
  });

  it("reports HTTP errors, empty answers and network failures as errors", async () => {
    const make = (impl: () => Promise<Response>) => ({ ...connection, fetch: impl as unknown as typeof fetch });
    assert.equal((await requestGeminiJson(make(async () => reply(500, {})), request)).ok, false);
    assert.equal((await requestGeminiJson(make(async () => reply(200, { candidates: [] })), request)).ok, false);
    assert.equal(
      (await requestGeminiJson(make(async () => { throw new Error("down"); }), request)).ok,
      false,
    );
  });
});
