import { getMissionCrew } from "@/features/crew/crew.queries";
import { CrewSection } from "@/features/crew/components/crew-section";
import { RiskBadge } from "@/features/risk/components/risk-badge";
import { getRiskBadges } from "@/features/risk/risk.queries";

export async function MissionSection() {
  const crew = await getMissionCrew();
  const risks = await getRiskBadges(
    crew.map((member) => ({
      id: member.id,
      heartRateBpm: member.vitals.heartRateBpm,
      spo2Pct: member.vitals.spo2Pct,
      sleepHours: member.vitals.sleepHours,
      cumulativeDoseMsv: member.cumulativeDoseMsv,
    })),
  );
  const badges = Object.fromEntries(
    crew.map((member) => [member.id, <RiskBadge key={member.id} risk={risks[member.id]} />]),
  );
  return <CrewSection crew={crew} badges={badges} />;
}
