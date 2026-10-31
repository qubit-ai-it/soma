import "server-only";

import { getServices } from "../../server/services.ts";
import { toCrewCard } from "./crew.logic.ts";
import type { CrewCardDTO } from "./crew.types.ts";

export async function getCrewCards(): Promise<CrewCardDTO[]> {
  return (await getServices().crew.list()).map(toCrewCard);
}
