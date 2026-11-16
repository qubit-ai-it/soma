import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createOllamaChat } from "./chat.client.ts";
import { IMAGE_ONLY_PROMPT } from "./chat.types.ts";

const ollamaURL = "https://example.ngrok-free.dev/api/chat";
const researchURL = "https://rag-nasa-search.onrender.com/api/research/search/";
const model = "configured-medgemma";
const answer = "## Context\n\nNASA describe Campout [S1].";

const ollama = (content: string) => Response.json({ message: { content } });
const research = (sources: unknown[]) => Response.json({
  collection: "spaceflight_health_research",
  sources,
});
const protocol = {
  title: "Evidence Report: Hypoxia and Decompression Sickness",
  url: "https://humanresearchroadmap.nasa.gov/evidence/report.pdf#page=20",
  page: 20,
  excerpt: `Campout and other documented strategies. ${"Context from the report. ".repeat(40)}`,
  evidence_type: "operational",
};

function chatWith(responses: Response[], authorization?: string) {
  const calls: { url: string; init: RequestInit }[] = [];
  const chat = createOllamaChat({
    url: ollamaURL,
    model,
    authorization,
    fetch: (async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      const result = responses.shift();
      assert.ok(result, "Unexpected HTTP request");
      return result;
    }) as typeof fetch,
  });
  return { chat, calls };
}

describe("Sentry research chat", () => {
  it("plans with the configured model, sends only ten vetted terms, and keeps history and images", async () => {
    const planned = ["flight", "breathing", "preflight", "oxygen", "protocol", "exercise", "crew", "space", "symptoms", "training"];
    const { chat, calls } = chatWith([
      ollama(JSON.stringify({ search: true, terms: planned })),
      research([
        { ...protocol, url: "https://nasa.gov.example.net/fake" },
        protocol,
        { ...protocol, page: null, section: "Exercise prebreathe", excerpt: "ISLE is one studied technique." },
        { ...protocol, page: 22, excerpt: "This third excerpt should stay out of the model context." },
      ]),
      ollama(answer),
    ], "Basic configured");
    const question = "I am Rosa. SpO₂ 94 %. What does NASA describe about prebreathing?";
    const result = await chat.replyWithResearch([
      { role: "user", content: "Previous question" },
      { role: "assistant", content: "Previous answer [S1]." },
      { role: "user", content: question, images: ["data:image/png;base64,aW1hZ2U="] },
    ]);
    assert.ok(result.ok);
    assert.equal(result.value.reply, answer);
    assert.deepEqual(calls.map(({ url }) => url), [ollamaURL, researchURL, ollamaURL]);

    const planner = JSON.parse(String(calls[0].init.body));
    assert.equal(planner.model, model);
    assert.equal(planner.think, false);
    assert.equal(planner.format.properties.terms.maxItems, 10);
    assert.ok(planner.format.properties.terms.items.enum.includes("isle"));
    assert.deepEqual(planner.messages.slice(1), [{ role: "user", content: question }]);
    assert.equal(calls[1].init.method, "POST");
    assert.equal(calls[1].init.redirect, "error");
    assert.equal(new Headers(calls[1].init.headers).get("authorization"), null);
    const body = JSON.parse(String(calls[1].init.body));
    assert.deepEqual(body, {
      question: "eva prebreathe decompression flight breathing preflight oxygen protocol exercise crew",
    });

    const final = JSON.parse(String(calls[2].init.body));
    assert.equal(final.model, model);
    assert.equal(final.stream, false);
    for (const i of [0, 2]) {
      assert.equal(new Headers(calls[i].init.headers).get("authorization"), "Basic configured");
    }
    assert.deepEqual(final.messages.slice(1, 3), [
      { role: "user", content: "Previous question" },
      { role: "assistant", content: "Previous answer [S1]." },
    ]);
    const latest = final.messages.at(-1);
    assert.deepEqual(latest.images, ["aW1hZ2U="]);
    assert.ok(latest.content.endsWith(question));
    const excerpts = JSON.parse(latest.content.split("\n")[1]);
    assert.deepEqual(excerpts.map((entry: { id: string }) => entry.id), ["S1", "S2"]);
    assert.equal(excerpts[0].page, 20);
    assert.equal(excerpts[0].evidenceType, "operational");
    assert.ok(excerpts[0].excerpt.length <= 500);
    assert.doesNotMatch(latest.content, /third excerpt/);
    assert.equal(result.value.research?.status, "found");
    if (result.value.research?.status !== "found") assert.fail("Expected research results");
    assert.equal(result.value.research.query, body.question);
    assert.equal(result.value.research.origin, "model");
    assert.deepEqual(result.value.research.sources.map(({ id }) => id), ["S1", "S2", "S3"]);
  });

  it("rejects unapproved output and tries the same fallback vocabulary as Swift", async () => {
    const { chat, calls } = chatWith([
      ollama('{"search":true,"terms":["dizziness","ID12345","94"]}'),
      research([]),
      ollama("Answer without sources."),
    ]);
    const result = await chat.replyWithResearch([{ role: "user", content: "I feel dizzy" }]);
    assert.ok(result.ok);
    assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
      question: "space motion sickness dizziness vestibular balance",
    });
    assert.equal(result.value.research?.status, "no-matches");
    assert.equal(result.value.research.origin, "fallback");
  });

  it("preserves catalog aliases, even if the model calls the lookup unnecessary", async () => {
    const { chat, calls } = chatWith([
      ollama('{"search":false,"terms":[]}'),
      research([protocol]),
      ollama(answer),
    ]);
    const result = await chat.replyWithResearch([{ role: "user", content: "What does ISLE describe?" }]);
    assert.ok(result.ok);
    assert.deepEqual(JSON.parse(String(calls[1].init.body)), { question: "isle eva prebreathe" });
  });

  it("continues without excerpts if the RAG has an error or returns a different collection", async () => {
    for (const bad of [
      new Response("down", { status: 503 }),
      Response.json({ collection: "historic_missions", sources: [protocol] }),
    ]) {
      const { chat, calls } = chatWith([
        ollama('{"search":true,"terms":["oxygen"]}'),
        bad,
        ollama("Answer available."),
      ]);
      const result = await chat.replyWithResearch([{ role: "user", content: "I am short of breath." }]);
      assert.ok(result.ok);
      assert.equal(result.value.research?.status, "unavailable");
      assert.doesNotMatch(String(calls[2].init.body), /Spaceflight research excerpts \(reference only\):/);
    }
  });

  it("omits the lookup for greetings, explicit urgent requests, and image-only turns", async () => {
    const greeting = chatWith([ollama('{"search":false,"terms":[]}'), ollama("Hello.")]);
    const result = await greeting.chat.replyWithResearch([{ role: "user", content: "Hello" }]);
    assert.ok(result.ok);
    assert.equal(result.value.research?.status, "skipped");
    assert.equal(greeting.calls.length, 2);

    const urgency = chatWith([ollama("Seek immediate help.")]);
    const urgent = await urgency.chat.replyWithResearch([{ role: "user", content: "It is urgent." }]);
    assert.ok(urgent.ok);
    assert.deepEqual(urgent.value.research, { status: "skipped", reason: "urgency" });
    assert.equal(urgency.calls.length, 1);

    const image = chatWith([ollama("I see a panel.")]);
    const imageReply = await image.chat.replyWithResearch([
      { role: "user", content: IMAGE_ONLY_PROMPT, images: ["data:image/png;base64,aW1hZ2U="] },
    ]);
    assert.ok(imageReply.ok);
    assert.deepEqual(imageReply.value.research, { status: "skipped", reason: "image-only" });
    assert.deepEqual(JSON.parse(String(image.calls[0].init.body)).messages.at(-1).images, ["aW1hZ2U="]);
  });
});
