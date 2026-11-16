"use client";

import { useLocalStore } from "@/shared/local-store";
import { useUserScope } from "@/features/roles/roles.store";

import { DEFAULT_SETTINGS, parseSettings, type Settings } from "./settings.logic";
import { scopedKey } from "./scope.logic";

export const SETTINGS_KEY = "soma.settings.v1";

export function useSettings(): [Settings, (update: Settings | ((previous: Settings) => Settings)) => void] {
  const scope = useUserScope();
  return useLocalStore<Settings>(scopedKey(SETTINGS_KEY, scope), DEFAULT_SETTINGS, parseSettings);
}
