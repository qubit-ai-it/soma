import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  chatReply,
  startFakeOllama,
  type FakeOllama,
  type FakeReply,
} from "./fake-ollama.testing.ts";
import { createOllamaPlanner } from "./ollama.client.ts";
import type { PlanInput } from "./planner.port.ts";

const input: PlanInput = { riskLevel: "high", concerns: ["SpO2 baja"] };
const goodOutput = {
  steps: ["Rest.", "Repeat measurements.", "Notify the flight surgeon."],
  uncertainty: "Draft from three signals only.",
};

let fake: FakeOllama | undefined;
afterEach(async () => {
  await fake?.close();
  fake = undefined;
});

async function plannerFor(reply: FakeReply, timeoutMs?: number) {
  fake = await startFakeOllama(reply);
  return createOllamaPlanner({
    baseUrl: `${fake.url}/`,
    model: "medgemma1.5:4b",
    timeoutMs,
  });
}

describe("Ollama planner client", () => {
  it("posts a non-streamed chat request with a JSON schema format", async () => {
    const planner = await plannerFor(chatReply(goodOutput));
    await planner.draft(input);

    assert.equal(fake!.requests.length, 1);
    const [request] = fake!.requests;
    assert.equal(request.method, "POST");
    assert.equal(request.url, "/api/chat");
    const body = request.body as {
      model: string;
      stream: boolean;
      format: { type: string; required: string[] };
      options: { temperature: number };
      messages: { role: string; content: string }[];
    };
    assert.equal(body.model, "medgemma1.5:4b");
    assert.equal(body.stream, false);
    assert.equal(body.format.type, "object");
    assert.deepEqual(body.format.required, ["steps", "uncertainty"]);
    assert.equal(body.options.temperature, 0);
    const prompt = body.messages.map((m) => m.content).join("\n");
    assert.ok(prompt.includes('"uncertainty"'));
    assert.ok(prompt.includes("SpO2 baja"));
    assert.ok(prompt.includes("high"));
  });

  it("returns a validated draft that always requires human validation", async () => {
    const planner = await plannerFor(
      chatReply({ ...goodOutput, requiresHumanValidation: false }),
    );
    const result = await planner.draft(input);
    assert.ok(result.ok);
    assert.deepEqual(result.value.steps, goodOutput.steps);
    assert.equal(result.value.uncertainty, goodOutput.uncertainty);
    assert.equal(result.value.requiresHumanValidation, true);
    assert.equal(result.value.source.provider, "ollama");
    assert.equal(result.value.source.mode, "live");
  });

  it("rejects a response that does not meet the schema", async () => {
    for (const content of [
      { steps: ["only", "two"], uncertainty: "x" },
      { steps: goodOutput.steps },
      { steps: goodOutput.steps, uncertainty: 5 },
      "not json at all",
      "[1, 2, 3]",
    ]) {
      const planner = await plannerFor(chatReply(content));
      const result = await planner.draft(input);
      assert.equal(result.ok, false);
      await fake?.close();
    }
  });

  it("fails on a body without message content", async () => {
    const planner = await plannerFor({ status: 200, body: { done: true } });
    assert.equal((await planner.draft(input)).ok, false);
  });

  it("fails on a non-JSON HTTP body", async () => {
    const planner = await plannerFor({ status: 200, raw: "<html>" });
    assert.equal((await planner.draft(input)).ok, false);
  });

  it("fails on an HTTP error without leaking the body", async () => {
    const planner = await plannerFor({ status: 404, body: { error: "secret detail" } });
    const result = await planner.draft(input);
    assert.ok(!result.ok);
    assert.ok(result.error.includes("404"));
    assert.ok(!result.error.includes("secret detail"));
  });

  it("fails when the server takes longer than the timeout", async () => {
    const planner = await plannerFor({ ...chatReply(goodOutput), delayMs: 500 }, 50);
    const result = await planner.draft(input);
    assert.equal(result.ok, false);
  });

  it("fails when nothing is listening", async () => {
    const planner = createOllamaPlanner({
      baseUrl: "http://127.0.0.1:1",
      model: "m",
      timeoutMs: 1000,
    });
    assert.equal((await planner.draft(input)).ok, false);
  });
});
