import type { JsonStore } from "../../server/json-store.ts";
import { crewFileSchema } from "./crew.schema.ts";
import type { CrewRepository } from "./crew.repository.ts";

const STORE_NAME = "crew";

export function createJsonCrewRepository(store: JsonStore): CrewRepository {
  async function load() {
    // Validate on every read: the file is editable by hand during the demo.
    return crewFileSchema.parse(await store.read(STORE_NAME)).crew;
  }

  return {
    list: load,
    get: async (id) => (await load()).find((member) => member.id === id) ?? null,
  };
}
