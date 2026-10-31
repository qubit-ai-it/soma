import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type JsonStore = {
  read: (name: string) => Promise<unknown>;
  update: (
    name: string,
    fn: (current: unknown) => unknown | Promise<unknown>,
  ) => Promise<unknown>;
};

type JsonStoreOptions = {
  seedDir: string;
  runtimeDir: string;
};

const NAME_PATTERN = /^[a-z0-9-]+$/;
const RETRYABLE = new Set(["EPERM", "EBUSY", "EACCES"]);
const RENAME_ATTEMPTS = 5;

// Lives on globalThis so dev-mode HMR module re-evaluation keeps the same locks.
const globalWithLocks = globalThis as typeof globalThis & {
  __somaJsonLocks?: Map<string, Promise<unknown>>;
};
const locks = (globalWithLocks.__somaJsonLocks ??= new Map());

function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const run = previous.then(task, task);
  locks.set(
    key,
    run.catch(() => undefined),
  );
  return run;
}

async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt >= RENAME_ATTEMPTS || !code || !RETRYABLE.has(code)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 20 * attempt));
    }
  }
}

async function writeAtomic(file: string, value: unknown): Promise<void> {
  const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, { flush: true });
  await renameWithRetry(tmp, file);
}

export function createJsonStore({
  seedDir,
  runtimeDir,
}: JsonStoreOptions): JsonStore {
  function runtimePath(name: string): string {
    if (!NAME_PATTERN.test(name)) {
      throw new Error(`Invalid store name "${name}"`);
    }
    return path.join(runtimeDir, `${name}.json`);
  }

  async function ensureRuntimeFile(name: string): Promise<string> {
    const file = runtimePath(name);
    try {
      await readFile(file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await mkdir(runtimeDir, { recursive: true });
      await copyFile(path.join(seedDir, `${name}.json`), file);
    }
    return file;
  }

  async function readUnlocked(name: string): Promise<unknown> {
    const file = await ensureRuntimeFile(name);
    return JSON.parse(await readFile(file, "utf-8"));
  }

  return {
    // Reads wait for pending writes of the same file, so they never see a torn state.
    // Async so an invalid name rejects instead of throwing synchronously.
    read: async (name) => withLock(runtimePath(name), () => readUnlocked(name)),
    update: async (name, fn) =>
      withLock(runtimePath(name), async () => {
        const next = await fn(await readUnlocked(name));
        await writeAtomic(runtimePath(name), next);
        return next;
      }),
  };
}
