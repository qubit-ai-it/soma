import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getMissionMember } from "@/features/crew/crew.queries";
import { FollowUpView } from "@/features/followup/components/followup-view";
import { StoredFollowUpView } from "@/features/followup/components/stored-followup-view";
import { getStoredFollowUp } from "@/features/followup/followup.stored";
import {
  FOLLOWUP_SCENARIOS,
  getFollowUp,
  type FollowUpScenarioId,
} from "@/features/followup/followup.queries";

export default function FollowUpPage({
  params,
  searchParams,
}: PageProps<"/report/[id]/follow-up">) {
  return (
    <Suspense fallback={<p className="text-ink">Cargando seguimiento…</p>}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({
  params,
  searchParams,
}: Pick<PageProps<"/report/[id]/follow-up">, "params" | "searchParams">) {
  const { id } = await params;
  const member = await getMissionMember(id);
  if (!member) notFound();

  const { escenario } = await searchParams;
  const scenarioId: FollowUpScenarioId =
    escenario === "followup-worsening" ? "followup-worsening" : "followup-recovery";

  const stored = await getStoredFollowUp(member.id);
  const followUp = await getFollowUp(member.id, scenarioId);
  if (!followUp) {
    return stored ? (
      <StoredFollowUpView record={stored.record} nowMs={stored.nowMs} />
    ) : (
      <p className="text-sm text-ink">Sin escenario de seguimiento para este tripulante.</p>
    );
  }

  return (
    <div className="space-y-6">
      {stored && <StoredFollowUpView record={stored.record} nowMs={stored.nowMs} />}
      {stored && <h2 className="font-heading text-lg font-bold">Escenarios de ejemplo</h2>}
      <nav aria-label="Escenario" className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink">Escenario:</span>
        {FOLLOWUP_SCENARIOS.map((s) => (
          <Link
            key={s.id}
            href={`/report/${member.id}/follow-up?escenario=${s.id}`}
            aria-current={s.id === scenarioId ? "page" : undefined}
            className={
              s.id === scenarioId
                ? "rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-full bg-secondary px-4 py-1.5 text-sm font-medium"
            }
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <FollowUpView contract={followUp.contract} result={followUp.result} />
    </div>
  );
}
