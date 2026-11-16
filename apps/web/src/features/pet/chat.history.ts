import type { ChatMessage } from "./chat.types.ts";

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};

export const MAX_CONVERSATIONS = 30;
export const NEW_CONVERSATION_TITLE = "Nueva conversación";
const TITLE_MAX = 48;

export function createConversation(id: string, now: number, greeting: ChatMessage): Conversation {
  return {
    id,
    title: NEW_CONVERSATION_TITLE,
    createdAt: now,
    updatedAt: now,
    messages: [greeting],
  };
}

export function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  const text = first?.content.trim().replace(/\s+/g, " ");
  if (!text) return NEW_CONVERSATION_TITLE;
  return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1)}…` : text;
}

function toStored(message: ChatMessage): ChatMessage {
  if (!message.images?.length) return message;
  const { images, ...rest } = message;
  return { ...rest, imageCount: images.length };
}

export function withMessages(
  conversation: Conversation,
  messages: ChatMessage[],
  now: number,
): Conversation {
  return { ...conversation, messages, title: deriveTitle(messages), updatedAt: now };
}

export function upsertConversation(list: Conversation[], conversation: Conversation): Conversation[] {
  const stored = { ...conversation, messages: conversation.messages.map(toStored) };
  const rest = list.filter((c) => c.id !== conversation.id);
  return [stored, ...rest]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CONVERSATIONS);
}

export function removeConversation(list: Conversation[], id: string): Conversation[] {
  return list.filter((c) => c.id !== id);
}

export function parseConversations(value: unknown): Conversation[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (c): c is Conversation =>
      typeof c === "object" &&
      c !== null &&
      typeof c.id === "string" &&
      typeof c.title === "string" &&
      typeof c.updatedAt === "number" &&
      Array.isArray(c.messages),
  );
}
