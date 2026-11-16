import { ok, type Result } from "../../shared/result.ts";
import type { SourceInfo } from "../../shared/source.ts";

// Fresh value inside the TTL; if the source fails, the last good value is served marked as cache
export function withCache<T extends { source: SourceInfo }>(
  ttlMs: number,
  load: () => Promise<Result<T>>,
  now: () => number = Date.now,
): () => Promise<Result<T>> {
  let last: { at: number; value: T } | null = null;

  return async () => {
    if (last && now() - last.at < ttlMs) return ok(last.value);
    const result = await load();
    if (result.ok) {
      last = { at: now(), value: result.value };
      return result;
    }
    if (last) return ok({ ...last.value, source: { ...last.value.source, mode: "cache" as const } });
    return result;
  };
}
