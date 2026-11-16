export { SENTRY_MODES, hexToRgb } from "../../shared/sentry.types.ts";
export type { SentryMode } from "../../shared/sentry.types.ts";

export const SENTRY_DEFAULT_COLOR = "#074EEA";

export const SENTRY_PALETTE = [
  { name: "Blue", value: SENTRY_DEFAULT_COLOR },
  { name: "Indigo", value: "#3730A3" },
  { name: "Violet", value: "#7C3AED" },
  { name: "Magenta", value: "#C026D3" },
  { name: "Pink", value: "#DB7DB4" },
  { name: "Red", value: "#E5322D" },
  { name: "Orange", value: "#F58A1F" },
  { name: "Green", value: "#4ADE50" },
  { name: "Turquoise", value: "#0D9488" },
  { name: "Gray", value: "#C9C7C4" },
] as const;
