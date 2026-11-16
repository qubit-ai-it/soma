export const GUEST_SCOPE = "guest";

export function scopedKey(base: string, scope: string): string {
  return `${base}:${scope.trim() === "" ? GUEST_SCOPE : scope}`;
}
