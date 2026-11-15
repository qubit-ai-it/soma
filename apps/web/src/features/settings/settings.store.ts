"use client";

import { useLocalStore } from "@/shared/local-store";

import { DEFAULT_SETTINGS, parseSettings, type Settings } from "./settings.logic";

export const SETTINGS_KEY = "soma.settings.v1";

export function useSettings(): [Settings, (update: Settings | ((previous: Settings) => Settings)) => void] {
  return useLocalStore<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS, parseSettings);
}
