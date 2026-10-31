import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { z } from "zod";

export async function readFixture<S extends z.ZodType>(
  name: string,
  schema: S,
): Promise<z.output<S>> {
  const file = path.join(process.cwd(), "data", "fixtures", `${name}.json`);
  return schema.parse(JSON.parse(await readFile(file, "utf-8")));
}
