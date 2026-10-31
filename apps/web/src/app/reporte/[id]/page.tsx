import { notFound } from "next/navigation";
import { Suspense } from "react";

import { VitalsSummary } from "@/features/crew/components/vitals-summary";
import { getMissionMember } from "@/features/crew/crew.queries";

export default function ReportSummaryPage({ params }: PageProps<"/reporte/[id]">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Cargando signos vitales…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/reporte/[id]">, "params">) {
  const member = await getMissionMember((await params).id);
  if (!member) notFound();
  return <VitalsSummary member={member} />;
}
