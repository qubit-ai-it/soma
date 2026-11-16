import type { EarthState } from "./earth.types.ts";

export function deliveredKeys(state: EarthState): Set<string> {
  const keys = new Set(state.inbox.map((receipt) => receipt.idempotencyKey));
  for (const packet of state.queue) if (packet.status === "acked") keys.add(packet.idempotencyKey);
  return keys;
}
