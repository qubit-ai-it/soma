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

function toWireMessages(history: ChatMessage[]) {
  const lastIndex = history.length - 1;
  return history.map((message, index) => {
    if (index !== lastIndex || !message.images?.length) {
      return { role: message.role, content: message.content };
    }
    return {
      role: message.role,
      content: [
        { type: "text", text: message.content },
        ...message.images.map((url) => ({ type: "image_url", image_url: { url } })),
      ],
    };
  });
}

export type GeminiChat = {
  reply(history: ChatMessage[]): Promise<Result<string>>;
};

export function createGeminiChat(options: GeminiChatOptions): GeminiChat {
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_CHAT_TIMEOUT_MS;
  const url = `${options.baseUrl.replace(/\/+$/, "")}/chat/completions`;

  return {
    async reply(history) {
      let content: unknown;
      try {
        const response = await doFetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify({
            model: options.model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...toWireMessages(history.slice(-MAX_HISTORY_MESSAGES)),
            ],
            reasoning_effort: "low",
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
          const detail = (await response.text().catch(() => "")).slice(0, 300);
          return err(`Gemini answered HTTP ${response.status}: ${detail}`);
        }
        const body: unknown = await response.json();
        content = (body as { choices?: { message?: { content?: unknown } }[] } | null)
          ?.choices?.[0]?.message?.content;
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
