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
import { createPostgresEarthRepository, seedEarthState } from "./earth.repository.postgres.ts";
import { earthStateSchema } from "./earth.schema.ts";
import { createEarthService } from "./earth.service.ts";

async function seedPostgres(seedDir: string, earthSeedDir: string) {
  const read = async (dir: string, name: string) => JSON.parse(await readFile(path.join(dir, name), "utf-8"));
  await seedAlertsAndAudit(getPool(), {
    alerts: alertsFileSchema.parse(await read(seedDir, "alerts.json")).alerts,
    entries: auditFileSchema.parse(await read(seedDir, "audit.json")).entries,
  });
  await seedEarthState(getPool(), earthStateSchema.parse(await read(earthSeedDir, "earth.json")));
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
  const earthSeedDir = path.join(process.cwd(), "src", "features", "earth", "seed");
  const ready = usePostgres ? seedPostgres(path.join(dataDir, "seed"), earthSeedDir) : Promise.resolve();
  ready.catch(() => undefined);
  const audit = usePostgres
    ? createPostgresAuditRepository(getPool(), ready)
    : createJsonAuditRepository(dataStore);
  const alertsRepo = usePostgres
    ? createPostgresAlertsRepository(getPool(), ready)
    : createJsonAlertsRepository(dataStore);
  const earth = createEarthService({
    repo: usePostgres ? createPostgresEarthRepository(getPool(), ready) : createJsonEarthRepository(earthStore),
    audit,
    onFlushed: usePostgres
      ? async (state) => {
          const { getPlanFlow } = await import("../../server/plans.server.ts");
          const { getFollowUpFlow } = await import("../../server/followup.server.ts");
          await getPlanFlow().reconcile(state);
          await getFollowUpFlow().reconcile(state);
        }
      : undefined,
  });
  const alerts = createAlertService({ alerts: alertsRepo, audit, enqueueToEarth: earth.enqueue });
  return { earth, alerts, alertsRepo, audit };
}

let cached: ReturnType<typeof build> | undefined;

// Entry point for other features: getEcosystem().alerts.raise(...), .audit.append(...), .earth.enqueue(...)
export function getEcosystem() {
  return (cached ??= build());
}
