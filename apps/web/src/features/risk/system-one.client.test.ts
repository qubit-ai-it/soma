import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  choiceReply,
  startFakeSystemOne,
  type FakeSystemOne,
} from "./fake-system-one.testing.ts";
import { createSystemOneClient } from "./system-one.client.ts";
import type { SystemOneRequest } from "./system-one.client.ts";

const request: SystemOneRequest = {
  model: "m",
  state: { a: 1 },
  questions: {
    risk: {
      type: "choice",
      instructions: "pick",
      criteria: { low: "l", moderate: "m", high: "h" },
    },
  },
};

const good = choiceReply({ low: 0.1, moderate: 0.2, high: 0.7 }, 0.8);

let fake: FakeSystemOne | undefined;
afterEach(async () => {
  await fake?.close();
  fake = undefined;
});

function clientFor(url: string, extra: Partial<Parameters<typeof createSystemOneClient>[0]> = {}) {
  const delays: number[] = [];
  const client = createSystemOneClient({
    baseUrl: url,
    apiKey: "secret-key",
    retry: { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 250 },
    sleep: async (ms) => {
      delays.push(ms);
    },
    ...extra,
  });
  return { client, delays };
}

describe("System One client", () => {
  it("posts the request to /v1/systemone with a bearer token and parses the answer", async () => {
    fake = await startFakeSystemOne([good]);
    const { client } = clientFor(fake.url);
    const result = await client.ask(request);
    assert.ok(result.ok);
    assert.equal(result.value.answers.risk.choice, "high");
    const [recorded] = fake.requests;
    assert.equal(recorded.method, "POST");
    assert.equal(recorded.url, "/v1/systemone");
    assert.equal(recorded.headers.authorization, "Bearer secret-key");
    assert.deepEqual(recorded.body, request);
  });

  it("omits Authorization when there is no key and tolerates a trailing slash", async () => {
    fake = await startFakeSystemOne([good]);
    const { client } = clientFor(`${fake.url}/`, { apiKey: undefined });
    assert.ok((await client.ask(request)).ok);
    assert.equal(fake.requests[0].headers.authorization, undefined);
    assert.equal(fake.requests[0].url, "/v1/systemone");
  });

  it("returns an invalid-response error for a body that fails validation", async () => {
    fake = await startFakeSystemOne([
      { status: 200, body: { answers: { risk: { type: "choice", choice: "high" } } } },
    ]);
    const result = await clientFor(fake.url).client.ask(request);
    assert.ok(!result.ok);
    assert.equal(result.error.kind, "invalid-response");
  });

  it("returns an invalid-response error for a body that is not JSON", async () => {
    fake = await startFakeSystemOne([{ status: 200, raw: "<html>nope</html>" }]);
    const result = await clientFor(fake.url).client.ask(request);
    assert.ok(!result.ok);
    assert.equal(result.error.kind, "invalid-response");
  });

  it("returns unauthorized on 401 without retrying or leaking the key", async () => {
    fake = await startFakeSystemOne([{ status: 401, body: { detail: "bad key" } }]);
    const { client, delays } = clientFor(fake.url);
    const result = await client.ask(request);
    assert.ok(!result.ok);
    assert.equal(result.error.kind, "unauthorized");
    assert.equal(result.error.status, 401);
    assert.ok(!result.error.message.includes("secret-key"));
    assert.equal(fake.requests.length, 1);
    assert.deepEqual(delays, []);
  });

  it("retries 429 with exponential backoff and succeeds", async () => {
    fake = await startFakeSystemOne([{ status: 429 }, { status: 429 }, good]);
    const { client, delays } = clientFor(fake.url);
    const result = await client.ask(request);
    assert.ok(result.ok);
    assert.equal(fake.requests.length, 3);
    assert.deepEqual(delays, [100, 200]);
  });

  it("gives up on 529 after the bounded retries, capping the delay", async () => {
    fake = await startFakeSystemOne([{ status: 529 }]);
    const { client, delays } = clientFor(fake.url);
    const result = await client.ask(request);
    assert.ok(!result.ok);
    assert.equal(result.error.kind, "overloaded");
    assert.equal(fake.requests.length, 4);
    assert.deepEqual(delays, [100, 200, 250]);
  });

  it("reports 429 as rate-limited once retries are exhausted", async () => {
    fake = await startFakeSystemOne([{ status: 429 }]);
    const result = await clientFor(fake.url).client.ask(request);
    assert.ok(!result.ok);
    assert.equal(result.error.kind, "rate-limited");
  });

  it("returns a request error for 422 without retrying", async () => {
    fake = await startFakeSystemOne([{ status: 422, body: { detail: [{ msg: "x" }] } }]);
    const { client } = clientFor(fake.url);
    const result = await client.ask(request);
    assert.ok(!result.ok);
    assert.equal(result.error.kind, "rejected");
    assert.equal(fake.requests.length, 1);
  });

  it("returns a network error when nothing is listening", async () => {
    fake = await startFakeSystemOne([good]);
    const url = fake.url;
    await fake.close();
    fake = undefined;
    const result = await clientFor(url).client.ask(request);
    assert.ok(!result.ok);
    assert.equal(result.error.kind, "network");
  });

  it("refuses a choice question above the provider limit before touching the network", async () => {
    fake = await startFakeSystemOne([good]);
    const { client } = clientFor(fake.url, { maxChoices: 2 });
    const result = await client.ask(request);
    assert.ok(!result.ok);
    assert.equal(result.error.kind, "rejected");
    assert.equal(fake.requests.length, 0);
  });
});
