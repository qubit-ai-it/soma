export const SOURCE_IDS = ["mission", "bluetooth"] as const;
export const XR_IDS = ["quest", "none"] as const;

export type SourceId = (typeof SOURCE_IDS)[number];
export type XrId = (typeof XR_IDS)[number];

export type Settings = {
  source: SourceId;
  xr: XrId;
  device?: string;
};

export const DEFAULT_SETTINGS: Settings = { source: "mission", xr: "none" };

export type SetupOption<T extends string> = { id: T; label: string; line: string; icon: string };

export const SOURCE_OPTIONS: readonly SetupOption<SourceId>[] = [
  { id: "mission", label: "Datos de misión", line: "Usa los datos de la tripulación.", icon: "groups" },
  { id: "bluetooth", label: "Reloj o banda", line: "Empareja por Bluetooth.", icon: "watch" },
];

export const XR_OPTIONS: readonly SetupOption<XrId>[] = [
  { id: "quest", label: "Meta Quest", line: "Guía los procedimientos en el visor.", icon: "view_in_ar" },
  { id: "none", label: "Sin visor", line: "Los pasos se ven en pantalla.", icon: "devices" },
];

function pick<T extends string>(ids: readonly T[], value: unknown, fallback: T): T {
  return ids.find((id) => id === value) ?? fallback;
}

export function parseSettings(raw: unknown): Settings {
  const record = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {};
  const { source, xr, device } = record as Record<string, unknown>;
  const settings: Settings = {
    source: pick(SOURCE_IDS, source, DEFAULT_SETTINGS.source),
    xr: pick(XR_IDS, xr, DEFAULT_SETTINGS.xr),
  };
  if (typeof device === "string" && device.length > 0) settings.device = device;
  return settings;
}
