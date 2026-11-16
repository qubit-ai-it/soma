import { requestGemini, type GeminiTurn } from "../../server/gemini-chat.ts";
import { requestOllamaChat, type OllamaMessage } from "../../server/ollama-chat.ts";
import type { Result } from "../../shared/result.ts";

export type ChatCall = {
  messages: OllamaMessage[];
  timeoutMs: number;
  signal?: AbortSignal;
  json?: object;
  maxTokens?: number;
};

export type ChatTransport = (call: ChatCall) => Promise<Result<string>>;

export function ollamaTransport(options: {
  url: string;
  model: string;
  authorization?: string;
  fetch?: typeof fetch;
}): ChatTransport {
  const headers = {
    "ngrok-skip-browser-warning": "1",
    ...(options.authorization ? { authorization: options.authorization } : {}),
  };
  return ({ messages, timeoutMs, signal, json, maxTokens }) =>
    requestOllamaChat(
      { url: options.url, timeoutMs, fetch: options.fetch, headers, signal },
      {
        model: options.model,
        messages,
        ...(json ? { format: json, think: false, options: { temperature: 0, num_predict: maxTokens ?? 112 } } : {}),
      },
    );
}

export function mimeFromBase64(data: string): string {
  if (data.startsWith("iVBOR")) return "image/png";
  if (data.startsWith("UklGR")) return "image/webp";
  if (data.startsWith("R0lGOD")) return "image/gif";
  return "image/jpeg";
}

export function toGeminiTurns(messages: OllamaMessage[]): { system: string; turns: GeminiTurn[] } {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const turns = messages
    .filter((message) => message.role !== "system")
    .map((message): GeminiTurn => ({
      role: message.role === "assistant" ? "model" : "user",
      text: message.content,
      ...(message.images?.length
        ? { images: message.images.map((data) => ({ mimeType: mimeFromBase64(data), data })) }
        : {}),
    }));
  return { system, turns };
}

export function geminiTransport(options: {
  apiKey: string;
  model: string;
  fetch?: typeof fetch;
}): ChatTransport {
  return ({ messages, timeoutMs, signal, json, maxTokens }) => {
    const { system, turns } = toGeminiTurns(messages);
    return requestGemini(
      { apiKey: options.apiKey, model: options.model, timeoutMs, fetch: options.fetch, signal },
      {
        system,
        turns,
        ...(json ? { json: true, schema: json, temperature: 0, maxOutputTokens: Math.max(maxTokens ?? 112, 512) } : {}),
      },
    );
  };
}
