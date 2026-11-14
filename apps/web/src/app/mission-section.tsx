import { CrewSummaryList } from "@/features/crew/components/crew-summary-list";
import { getCrewSummaries } from "@/features/crew/crew.queries";
import { RiskBadge } from "@/features/risk/components/risk-badge";
import { getRiskBadges } from "@/features/risk/risk.queries";
import { toRiskInput } from "./risk-request";

export async function MissionSection() {
  const crew = await getCrewSummaries();
  const risks = await getRiskBadges(crew.map((member) => ({ id: member.id, ...toRiskInput(member) })));
  const riskSlots = Object.fromEntries(
    crew.map((member) => [member.id, <RiskBadge key={member.id} risk={risks[member.id]} />]),
  );
  return (
    <>
      <CrewSummaryList
        crew={crew}
        hrefFor={(id) => `/reporte/${id}`}
        riskSlots={riskSlots}
      />
      <p className="mt-2 text-xs text-ink">
        La clasificación de riesgo requiere validación humana; no es un diagnóstico.
      </p>
    </>
  );
}
