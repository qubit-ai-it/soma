import { notFound } from "next/navigation";
import { Suspense } from "react";

import { VitalsSummary } from "@/features/crew/components/vitals-summary";
import { getMissionMember } from "@/features/crew/crew.queries";
import { getSessionCaller } from "@/features/roles/roles.session";

export default function ReportSummaryPage({ params }: PageProps<"/report/[id]">) {
  return (
    <Suspense fallback={<p className="text-ink">Loading vitals…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/report/[id]">, "params">) {
  const member = await getMissionMember((await params).id);
  if (!member) notFound();
  const caller = await getSessionCaller();
  return <VitalsSummary member={member} isOwn={caller?.memberId === member.id} />;
}
