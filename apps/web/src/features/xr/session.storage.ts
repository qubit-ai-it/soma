import { GUEST_SCOPE, scopedKey } from "../settings/scope.logic.ts";
import { restoreSession } from "./procedure.machine.ts";
import type { Procedure, SessionState } from "./procedure.types.ts";

export const SESSION_KEY = "soma.xr.session.v1";

export type SessionStorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function loadStoredSession(
  storage: SessionStorageLike | null,
  procedure: Procedure,
  scope: string = GUEST_SCOPE,
): SessionState | null {
  if (storage === null) return null;
  try {
    const raw = storage.getItem(scopedKey(SESSION_KEY, scope));
    if (raw === null) return null;
    const restored = restoreSession(JSON.parse(raw), procedure);
    return restored.ok ? restored.value : null;
  } catch {
    return null;
  }
}

export function saveSession(storage: SessionStorageLike | null, state: SessionState, scope: string = GUEST_SCOPE): void {
  try {
    storage?.setItem(scopedKey(SESSION_KEY, scope), JSON.stringify(state));
  } catch {
    // storage may be blocked or full; the session still works in memory
  }
}

export function clearStoredSession(storage: SessionStorageLike | null, scope: string = GUEST_SCOPE): void {
  try {
    storage?.removeItem(scopedKey(SESSION_KEY, scope));
  } catch {
    // nothing to clear
  }
}
