import type { EarthState } from "./earth.types.ts";

export type EarthRepository = {
  read: () => Promise<EarthState>;
  // Runs fn on the current state and persists the returned state atomically
  mutate: <R>(fn: (state: EarthState) => { state: EarthState; result: R }) => Promise<R>;
};
