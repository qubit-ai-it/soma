export const SENTRY_MODES = [
  "idle",
  "thinking",
  "listening",
  "working",
  "warning",
  "sleeping",
] as const;

export type SentryMode = (typeof SENTRY_MODES)[number];

export function hexToRgb(hex: string): [number, number, number] | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
