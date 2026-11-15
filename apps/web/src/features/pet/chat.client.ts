import { err, ok, type Result } from "../../shared/result.ts";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  images?: string[];
  imageCount?: number;
};

export type GeminiChatOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

export const DEFAULT_CHAT_TIMEOUT_MS = 60_000;
export const MAX_HISTORY_MESSAGES = 20;

const SYSTEM_PROMPT = [
  "You are Sentry, the friendly mascot assistant of Soma, a spaceflight crew health monitoring prototype.",
  "Answer in the user's language, briefly and warmly.",
  "You are not a doctor: never diagnose or prescribe, and point health concerns to the flight surgeon.",
].join(" ");

function toPart(dataUrl: string) {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  return match ? { inlineData: { mimeType: match[1], data: match[2] } } : null;
}

function toContents(history: ChatMessage[]) {
  const recent = history.slice(-MAX_HISTORY_MESSAGES);
  const firstUser = recent.findIndex((m) => m.role === "user");
  const lastIndex = recent.length - 1;
  return recent.slice(Math.max(0, firstUser)).map((message, offset) => {
    const isLast = Math.max(0, firstUser) + offset === lastIndex;
    const images = isLast ? (message.images ?? []).map(toPart).filter((p) => p !== null) : [];
    return {
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }, ...images],
    };
  });
}

export type GeminiChat = {
  reply(history: ChatMessage[]): Promise<Result<string>>;
};

export function createGeminiChat(options: GeminiChatOptions): GeminiChat {
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_CHAT_TIMEOUT_MS;
  const base = options.baseUrl.replace(/\/+$/, "").replace(/\/openai$/, "");
  const url = `${base}/models/${encodeURIComponent(options.model)}:generateContent`;

  return {
    async reply(history) {
      let content: unknown;
      try {
        const response = await doFetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": options.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: toContents(history),
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
          const detail = (await response.text().catch(() => "")).slice(0, 300);
          return err(`Gemini answered HTTP ${response.status}: ${detail}`);
        }
        const body: unknown = await response.json();
        const parts = (
          body as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] } | null
        )?.candidates?.[0]?.content?.parts;
        content = parts
          ?.map((part) => (typeof part.text === "string" ? part.text : ""))
          .join("");
      } catch (cause) {
        return err(`Gemini is unreachable, timed out or sent an unreadable body: ${String(cause)}`);
      }
      if (typeof content !== "string" || !content.trim()) {
        return err("Gemini response has no message content");
      }
      return ok(content.trim());
    },
  };
}
