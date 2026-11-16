import "server-only";

import path from "node:path";

import { readFile } from "node:fs/promises";

import { getPool } from "../../server/db.ts";
import { createJsonStore } from "../../server/json-store.ts";
import {
  createJsonAlertsRepository,
  createJsonAuditRepository,
} from "../alerts/alerts.repository.json.ts";
import {
  createPostgresAlertsRepository,
  createPostgresAuditRepository,
  seedAlertsAndAudit,
} from "../alerts/alerts.repository.postgres.ts";
import { alertsFileSchema, auditFileSchema } from "../alerts/alerts.schema.ts";
import { createAlertService } from "../alerts/alerts.service.ts";
import { createJsonEarthRepository } from "./earth.repository.json.ts";
import { createEarthService } from "./earth.service.ts";

async function seedPostgres(seedDir: string) {
  const read = async (name: string) => JSON.parse(await readFile(path.join(seedDir, name), "utf-8"));
  await seedAlertsAndAudit(getPool(), {
    alerts: alertsFileSchema.parse(await read("alerts.json")).alerts,
    entries: auditFileSchema.parse(await read("audit.json")).entries,
  });
}

function build() {
  const dataDir = path.join(process.cwd(), "data");
  const runtimeDir = path.join(dataDir, "runtime");
  const dataStore = createJsonStore({ seedDir: path.join(dataDir, "seed"), runtimeDir });
  // The Earth state seed lives with the feature; the runtime copy sits next to the other stores
  const earthStore = createJsonStore({
    seedDir: path.join(process.cwd(), "src", "features", "earth", "seed"),
    runtimeDir,
  });

  const usePostgres = Boolean(process.env.DATABASE_URL);
  const ready = usePostgres ? seedPostgres(path.join(dataDir, "seed")) : Promise.resolve();
  ready.catch(() => undefined);
  const audit = usePostgres
    ? createPostgresAuditRepository(getPool(), ready)
    : createJsonAuditRepository(dataStore);
  const alertsRepo = usePostgres
    ? createPostgresAlertsRepository(getPool(), ready)
    : createJsonAlertsRepository(dataStore);
  const earth = createEarthService({ repo: createJsonEarthRepository(earthStore), audit });
  const alerts = createAlertService({ alerts: alertsRepo, audit, enqueueToEarth: earth.enqueue });
  return { earth, alerts, alertsRepo, audit };
}

let cached: ReturnType<typeof build> | undefined;

// Entry point for other features: getEcosystem().alerts.raise(...), .audit.append(...), .earth.enqueue(...)
export function getEcosystem() {
  return (cached ??= build());
}
