import type { Level, Role } from "../roles/roles.types.ts";
import type { Viewer } from "./notifications.types.ts";

export const CREW_ALL = "crew:all";

export const roleKey = (role: Role) => `role:${role}`;
export const memberKey = (memberId: string) => `member:${memberId}`;

export function viewerKeys(viewer: Viewer): string[] {
  if (viewer.role === "astronaut") {
    return viewer.memberId ? [memberKey(viewer.memberId), CREW_ALL] : [CREW_ALL];
  }
  if (viewer.role === "earth") return [roleKey("earth")];
  return [roleKey(viewer.role), CREW_ALL];
}

export function readerKey(viewer: Viewer): string {
  if (viewer.role === "astronaut" && viewer.memberId) return memberKey(viewer.memberId);
  return roleKey(viewer.role);
}

export function isVisibleTo(audience: readonly string[], viewer: Viewer): boolean {
  const keys = viewerKeys(viewer);
  return audience.some((key) => keys.includes(key));
}

export function audienceForLevel(level: Level, memberId: string): string[] {
  if (level === "F3") return [CREW_ALL, roleKey("earth")];
  if (level === "F2") return [memberKey(memberId), roleKey("cmo")];
  if (level === "NOT_EVALUABLE") return [roleKey("cmo")];
  return [];
}

export function debounceBucket(nowMs: number, windowMs: number): number {
  return Math.floor(nowMs / windowMs);
}

export function alertDedupeKey(
  memberId: string,
  level: Level,
  nowMs: number,
  windowMs: number,
): string {
  return `alert:${memberId}:${level}:${debounceBucket(nowMs, windowMs)}`;
}
