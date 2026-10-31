import http from "node:http";
import type { AddressInfo } from "node:net";

export type RecordedRequest = {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: unknown;
};

export type FakeReply = { status: number; body?: unknown; raw?: string };

export type FakeSystemOne = {
  url: string;
  requests: RecordedRequest[];
  close(): Promise<void>;
};

// Replies are consumed in order; the last one repeats
export async function startFakeSystemOne(replies: FakeReply[]): Promise<FakeSystemOne> {
  const requests: RecordedRequest[] = [];
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      requests.push({
        method: req.method ?? "",
        url: req.url ?? "",
        headers: req.headers,
        body: text ? JSON.parse(text) : undefined,
      });
      const reply = replies[Math.min(requests.length - 1, replies.length - 1)];
      res.writeHead(reply.status, { "content-type": "application/json" });
      res.end(reply.raw ?? JSON.stringify(reply.body ?? {}));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

export function choiceReply(
  probabilities: Record<string, number>,
  confidence: number,
  model = "fake-model",
): FakeReply {
  const choice = Object.entries(probabilities).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  return {
    status: 200,
    body: {
      model,
      answers: { risk: { type: "choice", choice, confidence, probabilities } },
      usage: { input_tokens: 10, output_tokens: 2 },
    },
  };
}
