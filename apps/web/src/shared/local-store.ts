"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
}

export function useLocalStore<T>(
  key: string,
  fallback: T,
  parse: (value: unknown) => T,
): [T, (update: T | ((previous: T) => T)) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );

  const value = useMemo(() => {
    if (raw === null) return fallback;
    try {
      return parse(JSON.parse(raw));
    } catch {
      return fallback;
    }
  }, [raw, fallback, parse]);

  const set = useCallback(
    (update: T | ((previous: T) => T)) => {
      const currentRaw = readRaw(key);
      let current = fallback;
      if (currentRaw !== null) {
        try {
          current = parse(JSON.parse(currentRaw));
        } catch {
          current = fallback;
        }
      }
      const next = typeof update === "function" ? (update as (p: T) => T)(current) : update;
      writeRaw(key, JSON.stringify(next));
    },
    [key, fallback, parse],
  );

  return [value, set];
}
