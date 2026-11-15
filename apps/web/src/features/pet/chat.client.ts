import { requestOllamaChat, type OllamaMessage } from "../../server/ollama-chat.ts";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  images?: string[];
  imageCount?: number;
};

type OllamaChatOptions = {
  url: string;
  model: string;
  authorization?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

const DEFAULT_CHAT_TIMEOUT_MS = 120_000;
export const MAX_HISTORY_MESSAGES = 20;

const SYSTEM_PROMPT = [
  "You are Sentry, the friendly mascot assistant of Soma, a spaceflight crew health monitoring prototype.",
  "Answer in the user's language, briefly and warmly.",
  "You are not a doctor: never diagnose or prescribe, and point health concerns to the flight surgeon.",
].join(" ");

function toMessages(history: ChatMessage[]): OllamaMessage[] {
  const recent = history.slice(-MAX_HISTORY_MESSAGES);
  const firstUser = Math.max(0, recent.findIndex((message) => message.role === "user"));
  const turns = recent.slice(firstUser).map(({ role, content }): OllamaMessage => ({ role, content }));
  const lastTurn = turns.at(-1);
  if (lastTurn?.role === "user") {
    const images = (recent.at(-1)?.images ?? [])
      .map((image) => /^data:image\/[^;,]+;base64,(.+)$/.exec(image)?.[1])
      .filter((image) => image !== undefined);
    if (images.length) lastTurn.images = images;
  }

  return [{ role: "system", content: SYSTEM_PROMPT }, ...turns];
}

export function createOllamaChat(options: OllamaChatOptions) {
  const connection = {
    url: options.url,
    timeoutMs: options.timeoutMs ?? DEFAULT_CHAT_TIMEOUT_MS,
    fetch: options.fetch,
    headers: {
      "ngrok-skip-browser-warning": "1",
      ...(options.authorization ? { authorization: options.authorization } : {}),
    },
  };

  return {
    reply(history: ChatMessage[]) {
      return requestOllamaChat(connection, { model: options.model, messages: toMessages(history) });
    },
  };
}
