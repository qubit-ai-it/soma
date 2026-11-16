import type { Pool } from "pg";

export type SimulationStorage<State> = {
  update(fn: (current: State) => State | Promise<State>): Promise<State>;
};

const MISSION_ID = "mission";

export function createMemoryStorage<State>(initialState: () => Promise<State>): SimulationStorage<State> {
  let state: State | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  return {
    update(fn) {
      const next = queue.then(async () => {
        const current = (state ??= await initialState());
        return (state = await fn(current));
      });
      queue = next.catch(() => undefined);
      return next;
    },
  };
}

export function createPostgresStorage<State>(
  pool: Pool,
  initialState: () => Promise<State>,
  isValid: (value: unknown) => value is State,
): SimulationStorage<State> {
  return {
    async update(fn) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const { rows } = await client.query<{ state: unknown }>(
          "select state from simulation_state where id = $1 for update",
          [MISSION_ID],
        );
        const saved = rows[0]?.state;
        const current = isValid(saved) ? saved : await initialState();
        const next = await fn(current);
        await client.query(
          `insert into simulation_state (id, state, updated_at) values ($1, $2, now())
           on conflict (id) do update set state = excluded.state, updated_at = now()`,
          [MISSION_ID, JSON.stringify(next)],
        );
        await client.query("commit");
        return next;
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
