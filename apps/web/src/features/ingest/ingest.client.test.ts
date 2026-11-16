import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createIngestSender } from "./ingest.client.ts";

const reading = (at: number) => ({ at, bpm: 70 });

describe("ingest sender", () => {
  it("sends buffered readings and clears them on success", async () => {
    const sent: number[] = [];
    const sender = createIngestSender({
      subjectId: "live-astronaut",
      device: "Watch",
      post: async (body) => {
        sent.push(body.readings.length);
        return true;
      },
    });
    sender.push(reading(1));
    sender.push(reading(2));
    await sender.flush();
    assert.deepEqual(sent, [2]);
    assert.equal(sender.pending(), 0);
  });

  it("keeps readings when the post fails and retries later", async () => {
    let ok = false;
    const sender = createIngestSender({
      subjectId: "live-astronaut",
      device: "Watch",
      post: async () => ok,
    });
    sender.push(reading(1));
    await sender.flush();
    assert.equal(sender.pending(), 1);
    ok = true;
    await sender.flush();
    assert.equal(sender.pending(), 0);
  });

  it("treats a thrown network error as a failed post", async () => {
    const sender = createIngestSender({
      subjectId: "live-astronaut",
      device: "Watch",
      post: async () => {
        throw new Error("offline");
      },
    });
    sender.push(reading(1));
    await sender.flush();
    assert.equal(sender.pending(), 1);
  });

  it("splits large buffers into chunks of at most 500", async () => {
    const sizes: number[] = [];
    const sender = createIngestSender({
      subjectId: "live-astronaut",
      device: "Watch",
      post: async (body) => {
        sizes.push(body.readings.length);
        return true;
      },
    });
    for (let i = 1; i <= 1200; i++) sender.push(reading(i));
    await sender.flush();
    assert.deepEqual(sizes, [500, 500, 200]);
  });
});
