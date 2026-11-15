export { SENTRY_MODES, hexToRgb } from "../../shared/sentry.types.ts";
export type { SentryMode } from "../../shared/sentry.types.ts";

export const SENTRY_DEFAULT_COLOR = "#074EEA";

export const SENTRY_PALETTE = [
  { name: "Azul", value: SENTRY_DEFAULT_COLOR },
  { name: "Violeta", value: "#7C3AED" },
  { name: "Turquesa", value: "#0D9488" },
  { name: "Magenta", value: "#C026D3" },
  { name: "Índigo", value: "#3730A3" },
] as const;
