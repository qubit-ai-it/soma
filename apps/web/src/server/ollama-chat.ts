import { err, ok, type Result } from "../shared/result.ts";

export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
};

type OllamaChatRequest = {
  model: string;
  messages: OllamaMessage[];
  format?: object;
  think?: boolean;
  options?: { temperature: number; num_predict?: number };
};

type OllamaChatConnection = {
  url: string;
  timeoutMs: number;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
  signal?: AbortSignal;
};

export async function requestOllamaChat(
  connection: OllamaChatConnection,
  request: OllamaChatRequest,
): Promise<Result<string>> {
  const doFetch = connection.fetch ?? fetch;
  try {
    const timeout = AbortSignal.timeout(connection.timeoutMs);
    const response = await doFetch(connection.url, {
      method: "POST",
      headers: { "content-type": "application/json", ...connection.headers },
      body: JSON.stringify({ ...request, stream: false }),
      cache: "no-store",
      signal: connection.signal ? AbortSignal.any([timeout, connection.signal]) : timeout,
    });
    if (!response.ok) return err(`Ollama answered HTTP ${response.status}`);
    const body: unknown = await response.json();
    const content = (body as { message?: { content?: unknown } } | null)?.message?.content;
    return typeof content === "string" && content.trim()
      ? ok(content.trim())
      : err("Ollama response has no message content");
  } catch {
    return err("Ollama is unreachable, timed out or sent an unreadable body");
  }
}
