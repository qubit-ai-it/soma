import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getMissionMember } from "@/features/crew/crew.queries";
import { getEvaluationBoard } from "@/features/evaluation/evaluation.queries";
import { selectionInputFromCheckpoint } from "@/features/plan/plan.evaluation";
import { ImmediateStepsView } from "@/features/plan/components/immediate-steps-view";
import { StoredPlanCard } from "@/features/plan/components/stored-plan-card";
import { getImmediatePlan } from "@/features/plan/plan.queries";
import { selectionInputFromFlags } from "@/features/plan/plan.selection";
import { getStoredPlan } from "@/features/plan/plan.stored";
import { generatedBy } from "@/features/sentry/sentry.display";

export default function PlanPage({ params }: PageProps<"/report/[id]/plan">) {
  return (
    <Suspense fallback={<p className="text-ink">Loading plan…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/report/[id]/plan">, "params">) {
  const member = await getMissionMember((await params).id);
  if (!member) notFound();

  const board = await getEvaluationBoard();
  const scenario = board.scenarios.find(
    (s) => s.id === "fatigue-sleep-hrv" && s.subjectId === member.id,
  );
  const checkpoint = scenario?.checkpoints.at(-1);

  const { immediateSteps } = await getImmediatePlan(
    checkpoint
      ? selectionInputFromCheckpoint(checkpoint)
      : selectionInputFromFlags(
          member.flags.map((flag) => flag.code),
          member.attention,
        ),
  );

  const stored = await getStoredPlan(member.id);

  return (
    <div className="space-y-8">
      {stored && (
        <StoredPlanCard
          plan={stored.plan}
          link={stored.link}
          generated={generatedBy(stored.plan.createdAt, stored.nowMs)}
        />
      )}
      <ImmediateStepsView steps={immediateSteps} />
    </div>
  );
}
