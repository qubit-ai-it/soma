import { err, ok, type Result } from "../../shared/result.ts";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

// DONKI answers errors as plain text with status 200, so the body is checked, not just the status
export async function fetchJson(
  url: string,
  { fetchImpl = fetch, timeoutMs = 10_000 }: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): Promise<Result<unknown>> {
  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return err(`HTTP ${response.status}`);
    const text = await response.text();
    try {
      return ok(JSON.parse(text));
    } catch {
      return err(text.slice(0, 120) || "Respuesta no válida");
    }
  } catch (cause) {
    return err(cause instanceof Error ? cause.message : "Sin conexión");
  }
}
