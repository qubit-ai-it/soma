export const KEEPALIVE = ": keepalive\n\n";
export const RETRY = "retry: 3000\n\n";

export function formatEvent(input: { id: number; event: string; data: unknown }): string {
  return `id: ${input.id}\nevent: ${input.event}\ndata: ${JSON.stringify(input.data)}\n\n`;
}

export function parseCursor(header: string | null, query: string | null): number | undefined {
  for (const raw of [header, query]) {
    if (raw === null || raw.trim() === "") continue;
    const value = Number(raw);
    if (Number.isSafeInteger(value) && value >= 0) return value;
  }
  return undefined;
}
