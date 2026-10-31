import "server-only";

import { cache } from "react";

import { getServices } from "../../server/services.ts";
import { primarySignal, zoneReadings } from "./crew.body.ts";
import { toCrewCard } from "./crew.logic.ts";
import { vitalTrends } from "./crew.trend.ts";
import type {
  CrewMember,
  CrewSummaryDTO,
  MissionMemberDTO,
} from "./crew.types.ts";

function toMissionMember(member: CrewMember): MissionMemberDTO {
  return {
    ...toCrewCard(member),
    trends: vitalTrends(member.history),
    zones: zoneReadings(member),
    history: member.history ?? [],
  };
}

export async function getCrewSummaries(): Promise<CrewSummaryDTO[]> {
  return (await getServices().crew.list()).map((member) => ({
    ...toCrewCard(member),
    primarySignal: primarySignal(zoneReadings(member)),
  }));
}

// cache(): layout and page of one request share a single read
export const getMissionMember = cache(
  async (id: string): Promise<MissionMemberDTO | null> => {
    const member = await getServices().crew.get(id);
    return member ? toMissionMember(member) : null;
  },
);
