import { z } from "zod";

import { createMiniMaxChat } from "@/features/pet/chat.client";
import { getConfig } from "@/server/config";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { apiKey, baseUrl, model } = getConfig().chat;
  if (!apiKey) {
    return Response.json({ error: "Chat is not configured" }, { status: 503 });
  }

  const result = await createMiniMaxChat({ apiKey, baseUrl, model }).reply(
    parsed.data.messages,
  );
  if (!result.ok) {
    console.error("[chat]", result.error);
    return Response.json({ error: "Chat provider failed" }, { status: 502 });
  }
  return Response.json({ reply: result.value });
}
