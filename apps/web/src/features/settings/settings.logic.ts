import { SENTRY_DEFAULT_COLOR, SENTRY_PALETTE } from "../pet/pet.types.ts";

export const SOURCE_IDS = ["mission", "bluetooth"] as const;
export const XR_IDS = ["quest", "none"] as const;

export type SourceId = (typeof SOURCE_IDS)[number];
export type XrId = (typeof XR_IDS)[number];

export type Settings = {
  source: SourceId;
  xr: XrId;
  color: string;
  device?: string;
};

export const DEFAULT_SETTINGS: Settings = { source: "mission", xr: "none", color: SENTRY_DEFAULT_COLOR };

export type SetupOption<T extends string> = { id: T; label: string; line: string; icon: string };

export const SOURCE_OPTIONS: readonly SetupOption<SourceId>[] = [
  { id: "mission", label: "Mission data", line: "Use the crew data.", icon: "groups" },
  { id: "bluetooth", label: "Watch or band", line: "Pair over Bluetooth.", icon: "watch" },
];

export const XR_OPTIONS: readonly SetupOption<XrId>[] = [
  { id: "quest", label: "Meta Quest", line: "Guides procedures in the headset.", icon: "view_in_ar" },
  { id: "none", label: "No headset", line: "Steps appear on screen.", icon: "devices" },
];

function pick<T extends string>(ids: readonly T[], value: unknown, fallback: T): T {
  return ids.find((id) => id === value) ?? fallback;
}

export function parseSettings(raw: unknown): Settings {
  const record = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {};
  const { source, xr, color, device } = record as Record<string, unknown>;
  const settings: Settings = {
    source: pick(SOURCE_IDS, source, DEFAULT_SETTINGS.source),
    xr: pick(XR_IDS, xr, DEFAULT_SETTINGS.xr),
    color: pick(
      SENTRY_PALETTE.map((entry) => entry.value as string),
      color,
      DEFAULT_SETTINGS.color,
    ),
  };
  if (typeof device === "string" && device.length > 0) settings.device = device;
  return settings;
}
