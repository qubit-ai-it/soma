export { SENTRY_MODES, hexToRgb } from "../../shared/sentry.types.ts";
export type { SentryMode } from "../../shared/sentry.types.ts";

export const SENTRY_DEFAULT_COLOR = "#074EEA";

export const SENTRY_PALETTE = [
  { name: "Azul", value: SENTRY_DEFAULT_COLOR },
  { name: "Índigo", value: "#3730A3" },
  { name: "Violeta", value: "#7C3AED" },
  { name: "Magenta", value: "#C026D3" },
  { name: "Rosa", value: "#DB7DB4" },
  { name: "Rojo", value: "#E5322D" },
  { name: "Naranja", value: "#F58A1F" },
  { name: "Verde", value: "#4ADE50" },
  { name: "Turquesa", value: "#0D9488" },
  { name: "Gris", value: "#C9C7C4" },
] as const;
