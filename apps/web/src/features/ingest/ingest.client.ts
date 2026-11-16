import type { Reading } from "../live/live.logic.ts";
import { MAX_READINGS_PER_REQUEST } from "./ingest.schema.ts";

export const INGEST_INTERVAL_MS = 5000;
const MAX_BUFFER = 5000;

type Post = (body: { subjectId: string; device: string; readings: Reading[] }) => Promise<boolean>;

export function createIngestSender(deps: { subjectId: string; device: string; post: Post }) {
  let buffer: Reading[] = [];
  let flushing = false;

  return {
    push(reading: Reading) {
      buffer.push(reading);
      if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER);
    },
    pending: () => buffer.length,
    async flush(): Promise<void> {
      if (flushing || buffer.length === 0) return;
      flushing = true;
      try {
        while (buffer.length > 0) {
          const chunk = buffer.slice(0, MAX_READINGS_PER_REQUEST);
          const sent = await deps
            .post({ subjectId: deps.subjectId, device: deps.device, readings: chunk })
            .catch(() => false);
          if (!sent) return;
          buffer = buffer.slice(chunk.length);
        }
      } finally {
        flushing = false;
      }
    },
  };
}

export async function postReadings(body: Parameters<Post>[0]): Promise<boolean> {
  const response = await fetch("/api/ingesta", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  });
  return response.ok;
}
