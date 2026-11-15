import type { JsonStore } from "../../server/json-store.ts";
import { earthStateSchema } from "./earth.schema.ts";
import type { EarthRepository } from "./earth.repository.ts";

export const EARTH_STORE_NAME = "earth";

export function createJsonEarthRepository(store: JsonStore): EarthRepository {
  return {
    read: async () => earthStateSchema.parse(await store.read(EARTH_STORE_NAME)),
    mutate: async (fn) => {
      let result!: ReturnType<typeof fn>["result"];
      await store.update(EARTH_STORE_NAME, (current) => {
        const outcome = fn(earthStateSchema.parse(current));
        result = outcome.result;
        return earthStateSchema.parse(outcome.state);
      });
      return result;
    },
  };
}
