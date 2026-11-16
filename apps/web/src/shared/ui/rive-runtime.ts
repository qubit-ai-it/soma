import { RuntimeLoader } from "@rive-app/react-canvas";

export const RIVE_ASSET_VERSION = "1";

RuntimeLoader.setWasmUrl(`/rive/rive.wasm?v=${RIVE_ASSET_VERSION}`);
RuntimeLoader.setWasmFallbackUrl(`/rive/rive_fallback.wasm?v=${RIVE_ASSET_VERSION}`);

export const MASCOT_SRC = `/mascot/soma.riv?v=${RIVE_ASSET_VERSION}`;
