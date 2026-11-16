import { err, ok, type Result } from "../shared/result.ts";

type GeminiConnection = {
  apiKey: string;
  model: string;
  timeoutMs: number;
  fetch?: typeof fetch;
  signal?: AbortSignal;
};

export type GeminiImage = { mimeType: string; data: string };

export type GeminiTurn = {
  role: "user" | "model";
  text: string;
  images?: GeminiImage[];
};

type GeminiRequest = {
  system: string;
  turns: GeminiTurn[];
  json?: boolean;
  schema?: object;
  temperature?: number;
  maxOutputTokens?: number;
};

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

function buildBody(request: GeminiRequest, withSchema: boolean) {
  return {
    systemInstruction: { parts: [{ text: request.system }] },
    contents: request.turns.map((turn) => ({
      role: turn.role,
      parts: [
        ...(turn.images ?? []).map((image) => ({ inlineData: { mimeType: image.mimeType, data: image.data } })),
        { text: turn.text },
      ],
    })),
    generationConfig: {
      ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
      ...(request.maxOutputTokens === undefined ? {} : { maxOutputTokens: request.maxOutputTokens }),
      ...(request.json ? { responseMimeType: "application/json" } : {}),
      ...(request.json && withSchema && request.schema ? { responseJsonSchema: request.schema } : {}),
    },
  };
}

function textOf(body: unknown): string | null {
  const parts = (body as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] } | null)
    ?.candidates?.[0]?.content?.parts;
  const text = parts?.map((part) => (typeof part.text === "string" ? part.text : "")).join("").trim();
  return text ? text : null;
}

export async function requestGemini(
  connection: GeminiConnection,
  request: GeminiRequest,
): Promise<Result<string>> {
  const doFetch = connection.fetch ?? fetch;
  const url = `${ENDPOINT}/${encodeURIComponent(connection.model)}:generateContent`;

  async function call(withSchema: boolean): Promise<Response> {
    const timeout = AbortSignal.timeout(connection.timeoutMs);
    return doFetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": connection.apiKey },
      body: JSON.stringify(buildBody(request, withSchema)),
      cache: "no-store",
      signal: connection.signal ? AbortSignal.any([timeout, connection.signal]) : timeout,
    });
  }

  try {
    let response = await call(true);
    if (response.status === 400 && request.json && request.schema) response = await call(false);
    if (!response.ok) return err(`Gemini answered HTTP ${response.status}`);
    const text = textOf(await response.json());
    return text ? ok(text) : err("Gemini response has no text");
  } catch {
    return err("Gemini is unreachable, timed out or sent an unreadable body");
  }
}

export function requestGeminiJson(
  connection: Omit<GeminiConnection, "signal">,
  request: { system: string; user: string; schema?: object; temperature?: number },
): Promise<Result<string>> {
  return requestGemini(connection, {
    system: request.system,
    turns: [{ role: "user", text: request.user }],
    json: true,
    schema: request.schema,
    temperature: request.temperature ?? 0,
  });
}
