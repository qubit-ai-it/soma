import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createGeminiChat } from "./chat.client.ts";
import { mimeFromBase64, toGeminiTurns } from "./chat.transport.ts";
import { IMAGE_ONLY_PROMPT } from "./chat.types.ts";

const gemini = (text: string) => Response.json({ candidates: [{ content: { parts: [{ text }] } }] });
const research = Response.json({ collection: "spaceflight_health_research", sources: [] });

type Call = { url: string; headers: Record<string, string>; body: any };

function chatWith(responder: (call: Call) => Response) {
  const calls: Call[] = [];
  const chat = createGeminiChat({
    apiKey: "key-1",
    model: "gemini-test",
    fetch: (async (url: string, init: RequestInit) => {
      const call = { url, headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(init.body as string) : null };
      calls.push(call);
      return responder(call);
    }) as unknown as typeof fetch,
  });
  return { chat, calls };
}

describe("createGeminiChat", () => {
  it("answers with Gemini: system prompt, roles mapped and the key sent in a header", async () => {
    const { chat, calls } = chatWith(() => gemini("  Hello there  "));
    const result = await chat.replyWithResearch([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
      { role: "user", content: IMAGE_ONLY_PROMPT, images: ["data:image/png;base64,iVBORw0KGgo="] },
    ]);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.reply, "Hello there");
    assert.equal(calls.length, 1);
    const [call] = calls;
    assert.ok(call.url.includes("/gemini-test:generateContent"));
    assert.equal(call.headers["x-goog-api-key"], "key-1");
    assert.match(call.body.systemInstruction.parts[0].text, /You are Sentry/);
    assert.deepEqual(call.body.contents.map((turn: { role: string }) => turn.role), ["user", "model", "user"]);
    const last = call.body.contents[2].parts;
    assert.equal(last[0].inlineData.mimeType, "image/png");
    assert.equal(last[0].inlineData.data, "iVBORw0KGgo=");
    assert.equal(call.body.generationConfig.responseMimeType, undefined);
  });

  it("plans the research lookup with Gemini in JSON mode before the final answer", async () => {
    const { chat, calls } = chatWith((call) => {
      if (call.url.includes("rag-nasa-search")) return research;
      return call.body.generationConfig?.responseMimeType === "application/json" ? gemini("not json") : gemini("Final answer");
    });
    const result = await chat.replyWithResearch([{ role: "user", content: "How does microgravity affect sleep?" }]);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.reply, "Final answer");
    const geminiCalls = calls.filter((call) => call.url.includes("generateContent"));
    assert.equal(geminiCalls.length, 2);
    assert.equal(geminiCalls[0].body.generationConfig.responseMimeType, "application/json");
    assert.ok(geminiCalls[0].body.generationConfig.maxOutputTokens >= 512);
  });

  it("reports a provider failure instead of throwing", async () => {
    const { chat } = chatWith(() => new Response("{}", { status: 500 }));
    const result = await chat.replyWithResearch([
      { role: "user", content: IMAGE_ONLY_PROMPT, images: ["data:image/png;base64,iVBORw0KGgo="] },
    ]);
    assert.equal(result.ok, false);
  });
});

describe("gemini transport helpers", () => {
  it("detects the image type from the base64 prefix", () => {
    assert.equal(mimeFromBase64("iVBORw0KGgo="), "image/png");
    assert.equal(mimeFromBase64("UklGRgAA"), "image/webp");
    assert.equal(mimeFromBase64("/9j/4AAQ"), "image/jpeg");
  });

  it("splits system messages from the turns", () => {
    const { system, turns } = toGeminiTurns([
      { role: "system", content: "rules" },
      { role: "user", content: "q" },
      { role: "assistant", content: "a" },
    ]);
    assert.equal(system, "rules");
    assert.deepEqual(turns.map((turn) => turn.role), ["user", "model"]);
  });
});
