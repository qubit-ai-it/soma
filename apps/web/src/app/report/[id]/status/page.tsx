import { notFound } from "next/navigation";
import { Suspense } from "react";

import { StateView } from "@/features/crew/components/state-view";
import { getMissionMember } from "@/features/crew/crew.queries";
import { getRisk } from "@/features/risk/risk.queries";
import { toRiskInput } from "../../../risk-request";

export default function StatePage({ params }: PageProps<"/report/[id]/status">) {
  return (
    <Suspense fallback={<p className="text-ink">Cargando estado…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/report/[id]/status">, "params">) {
  const member = await getMissionMember((await params).id);
  if (!member) notFound();
  return <StateView member={member} risk={await getRisk(toRiskInput(member))} />;
}
