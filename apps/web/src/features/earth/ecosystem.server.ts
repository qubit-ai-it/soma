import "server-only";

import path from "node:path";

import { createJsonStore } from "../../server/json-store.ts";
import {
  createJsonAlertsRepository,
  createJsonAuditRepository,
} from "../alerts/alerts.repository.json.ts";
import { createAlertService } from "../alerts/alerts.service.ts";
import { createJsonEarthRepository } from "./earth.repository.json.ts";
import { createEarthService } from "./earth.service.ts";

function build() {
  const dataDir = path.join(process.cwd(), "data");
  const runtimeDir = path.join(dataDir, "runtime");
  const dataStore = createJsonStore({ seedDir: path.join(dataDir, "seed"), runtimeDir });
  // The Earth state seed lives with the feature; the runtime copy sits next to the other stores
  const earthStore = createJsonStore({
    seedDir: path.join(process.cwd(), "src", "features", "earth", "seed"),
    runtimeDir,
  });

  const audit = createJsonAuditRepository(dataStore);
  const alertsRepo = createJsonAlertsRepository(dataStore);
  const earth = createEarthService({ repo: createJsonEarthRepository(earthStore), audit });
  const alerts = createAlertService({ alerts: alertsRepo, audit, enqueueToEarth: earth.enqueue });
  return { earth, alerts, alertsRepo, audit };
}

let cached: ReturnType<typeof build> | undefined;

// Entry point for other features: getEcosystem().alerts.raise(...), .audit.append(...), .earth.enqueue(...)
export function getEcosystem() {
  return (cached ??= build());
}
