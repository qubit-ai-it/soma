import { connection } from "next/server";

import { openLevels } from "@/features/alerts/alerts.display";
import { getCrewSummaries } from "@/features/crew/crew.queries";
import { getEcosystem } from "@/features/earth/ecosystem.server";
import { RiskBadge } from "@/features/risk/components/risk-badge";
import { getRiskBadges } from "@/features/risk/risk.queries";
import type { Level } from "@/features/roles/roles.types";

import { RoleHome } from "./role-home";
import { toRiskInput } from "./risk-request";

export async function MissionSection() {
  await connection();
  const crew = await getCrewSummaries();
  const risks = await getRiskBadges(crew.map((member) => ({ id: member.id, ...toRiskInput(member) })));
  const riskSlots = Object.fromEntries(
    crew.map((member) => [member.id, <RiskBadge key={member.id} risk={risks[member.id]} />]),
  );

  const alerts = await getEcosystem().alertsRepo.list();
  const open = new Map(openLevels(alerts).map((entry) => [entry.memberId, entry.level]));
  const levels: { memberId: string; level: Level }[] = crew.map((member) => ({
    memberId: member.id,
    level: open.get(member.id) ?? "F0",
  }));
  const f3Open = alerts.filter((a) => a.status !== "closed" && a.level === "F3").length;

  return <RoleHome crew={crew} riskSlots={riskSlots} levels={levels} f3Open={f3Open} />;
}
