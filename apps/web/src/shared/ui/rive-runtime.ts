import { RuntimeLoader } from "@rive-app/react-canvas";

RuntimeLoader.setWasmUrl("/rive/rive.wasm");
RuntimeLoader.setWasmFallbackUrl("/rive/rive_fallback.wasm");

export const MASCOT_SRC = "/mascot/soma.riv";
