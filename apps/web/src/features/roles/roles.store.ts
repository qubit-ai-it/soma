"use client";

import { useUser } from "@clerk/nextjs";
import { useSyncExternalStore } from "react";

import { isRole, roleFromMetadata } from "./roles.logic.ts";
import type { Role } from "./roles.types.ts";

const STORAGE_KEY = "soma.demo-role";
const DEFAULT_ROLE: Role = "astronaut";

const listeners = new Set<() => void>();
let current: Role | undefined;

function readStored(): Role {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isRole(value) ? value : DEFAULT_ROLE;
  } catch {
    return DEFAULT_ROLE;
  }
}

function getSnapshot(): Role {
  return (current ??= readStored());
}

function getServerSnapshot(): Role {
  return DEFAULT_ROLE;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setDemoRole(role: Role): void {
  current = role;
  try {
    window.localStorage.setItem(STORAGE_KEY, role);
  } catch {
    // storage unavailable: the role lives in memory only
  }
  listeners.forEach((listener) => listener());
}

export function getStoredRole(): Role {
  return getSnapshot();
}

export function useDemoRole(): Role {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { user } = useUser();
  return roleFromMetadata(user?.publicMetadata) ?? stored;
}
