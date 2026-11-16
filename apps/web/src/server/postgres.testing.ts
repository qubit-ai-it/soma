import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import pg from "pg";

export const hasDatabase = Boolean(process.env.DATABASE_URL);
export const hasDirectDatabase = Boolean(process.env.DATABASE_URL_UNPOOLED);

export function testPool(): pg.Pool {
  return new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
}

export async function createTestSchema(): Promise<{ pool: pg.Pool; drop: () => Promise<void> }> {
  const schema = `t_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const url = process.env.DATABASE_URL_UNPOOLED;
  const admin = new pg.Pool({ connectionString: url, max: 1 });
  await admin.query(`create schema ${schema}`);
  const pool = new pg.Pool({ connectionString: url, max: 6, options: `-c search_path=${schema}` });
  const dir = path.join(process.cwd(), "db", "migrations");
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
    await pool.query(await readFile(path.join(dir, file), "utf8"));
  }
  return {
    pool,
    drop: async () => {
      await pool.end();
      await admin.query(`drop schema ${schema} cascade`);
      await admin.end();
    },
  };
}
