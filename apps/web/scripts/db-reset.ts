import { cp, rm } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const runtimeDir = path.join(dataDir, "runtime");

await rm(runtimeDir, { recursive: true, force: true });
await cp(path.join(dataDir, "seed"), runtimeDir, { recursive: true });
console.log("data/runtime restored from data/seed");
