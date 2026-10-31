import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getMissionMember } from "@/features/crew/crew.queries";
import { RiskPanel } from "@/features/risk/components/risk-panel";
import { getRisk } from "@/features/risk/risk.queries";
import { toRiskInput } from "../../../risk-request";

export default function RiskPage({ params }: PageProps<"/reporte/[id]/riesgo">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Clasificando riesgo…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/reporte/[id]/riesgo">, "params">) {
  const member = await getMissionMember((await params).id);
  if (!member) notFound();
  return <RiskPanel risk={await getRisk(toRiskInput(member))} />;
}
