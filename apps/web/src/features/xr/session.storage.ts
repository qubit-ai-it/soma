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
): SessionState | null {
  if (storage === null) return null;
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (raw === null) return null;
    const restored = restoreSession(JSON.parse(raw), procedure);
    return restored.ok ? restored.value : null;
  } catch {
    return null;
  }
}

export function saveSession(storage: SessionStorageLike | null, state: SessionState): void {
  try {
    storage?.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // storage may be blocked or full; the session still works in memory
  }
}

export function clearStoredSession(storage: SessionStorageLike | null): void {
  try {
    storage?.removeItem(SESSION_KEY);
  } catch {
    // nothing to clear
  }
}
