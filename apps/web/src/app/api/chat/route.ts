import { z } from "zod";

import { createOllamaChat } from "@/features/pet/chat.client";
import { getConfig } from "@/server/config";

// Allow the planning, research, and final answer requests to complete.
export const maxDuration = 225;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
        images: z
          .array(z.string().startsWith("data:image/").max(2_000_000))
          .max(3)
          .optional(),
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

  const { url, model, authorization } = getConfig().chat;
  if (!url) {
    return Response.json({ error: "Chat is unavailable" }, { status: 503 });
  }

  const result = await createOllamaChat({ url, model, authorization }).replyWithResearch(
    parsed.data.messages,
    request.signal,
  );
  if (!result.ok) {
    console.error("[chat]", result.error);
    return Response.json({ error: "Chat provider failed" }, { status: 502 });
  }
  return Response.json(result.value);
}
