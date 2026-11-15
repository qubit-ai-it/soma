import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { protocolLibrarySchema } from "./protocols.schema.ts";
import type { ProtocolLibrary } from "./protocols.types.ts";

// read-only curated content: not copied to the runtime store
export async function getProtocolLibrary(): Promise<ProtocolLibrary> {
  const file = path.join(process.cwd(), "data", "seed", "protocols.json");
  return protocolLibrarySchema.parse(JSON.parse(await readFile(file, "utf-8")));
}
