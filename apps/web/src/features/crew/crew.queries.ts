import "server-only";

import { getServices } from "../../server/services.ts";
import { zoneReadings } from "./crew.body.ts";
import { toCrewCard } from "./crew.logic.ts";
import { vitalTrends } from "./crew.trend.ts";
import type { MissionMemberDTO } from "./crew.types.ts";

export async function getMissionCrew(): Promise<MissionMemberDTO[]> {
  return (await getServices().crew.list()).map((member) => ({
    ...toCrewCard(member),
    trends: vitalTrends(member.history),
    zones: zoneReadings(member),
    history: member.history ?? [],
  }));
}
