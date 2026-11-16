import { Pool } from "pg";

const globalForDb = globalThis as unknown as { somaPool?: Pool };

export function getPool(): Pool {
  if (!globalForDb.somaPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    globalForDb.somaPool = new Pool({ connectionString, max: 5 });
  }
  return globalForDb.somaPool;
}
