import { err, ok, type Result } from "../../shared/result.ts";

export type ChatRole = "user" | "assistant";

export type ChatMessage = { role: ChatRole; content: string };

export type MiniMaxChatOptions = {
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

export type MiniMaxChat = {
  reply(history: ChatMessage[]): Promise<Result<string>>;
};

export function createMiniMaxChat(options: MiniMaxChatOptions): MiniMaxChat {
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
              ...history.slice(-MAX_HISTORY_MESSAGES),
            ],
            reasoning_effort: "low",
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) return err(`MiniMax answered HTTP ${response.status}`);
        const body: unknown = await response.json();
        content = (body as { choices?: { message?: { content?: unknown } }[] } | null)
          ?.choices?.[0]?.message?.content;
      } catch {
        return err("MiniMax is unreachable, timed out or sent an unreadable body");
      }
      if (typeof content !== "string" || !content.trim()) {
        return err("MiniMax response has no message content");
      }
      return ok(content.trim());
    },
  };
}
