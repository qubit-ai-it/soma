import http from "node:http";
import type { AddressInfo } from "node:net";

export type RecordedRequest = {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: unknown;
};

export type FakeReply = { status: number; body?: unknown; raw?: string; delayMs?: number };

export type FakeOllama = {
  url: string;
  requests: RecordedRequest[];
  close(): Promise<void>;
};

export async function startFakeOllama(reply: FakeReply): Promise<FakeOllama> {
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
      setTimeout(() => {
        res.writeHead(reply.status, { "content-type": "application/json" });
        res.end(reply.raw ?? JSON.stringify(reply.body ?? {}));
      }, reply.delayMs ?? 0);
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

export function chatReply(content: unknown): FakeReply {
  return {
    status: 200,
    body: {
      model: "fake-model",
      message: {
        role: "assistant",
        content: typeof content === "string" ? content : JSON.stringify(content),
      },
      done: true,
      done_reason: "stop",
    },
  };
}
