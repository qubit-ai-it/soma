import pg from "pg";

export const hasDatabase = Boolean(process.env.DATABASE_URL);

export function testPool(): pg.Pool {
  return new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
}
