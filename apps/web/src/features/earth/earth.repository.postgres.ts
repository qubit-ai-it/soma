import type { Pool } from "pg";

import { earthStateSchema } from "./earth.schema.ts";
import type { EarthRepository } from "./earth.repository.ts";
import type { EarthState } from "./earth.types.ts";

export async function seedEarthState(pool: Pool, seed: EarthState): Promise<void> {
  await pool.query(
    "insert into earth_state (id, state) values (1, $1) on conflict (id) do nothing",
    [JSON.stringify(seed)],
  );
}

export function createPostgresEarthRepository(
  pool: Pool,
  ready: Promise<void> = Promise.resolve(),
): EarthRepository {
  return {
    read: async () => {
      await ready;
      const { rows } = await pool.query<{ state: unknown }>("select state from earth_state where id = 1");
      if (!rows[0]) throw new Error("earth_state is not seeded");
      return earthStateSchema.parse(rows[0].state);
    },
    mutate: async (fn) => {
      await ready;
      const client = await pool.connect();
      try {
        await client.query("begin");
        const { rows } = await client.query<{ state: unknown }>(
          "select state from earth_state where id = 1 for update",
        );
        if (!rows[0]) throw new Error("earth_state is not seeded");
        const outcome = fn(earthStateSchema.parse(rows[0].state));
        await client.query("update earth_state set state = $1, updated_at = now() where id = 1", [
          JSON.stringify(earthStateSchema.parse(outcome.state)),
        ]);
        await client.query("commit");
        return outcome.result;
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
