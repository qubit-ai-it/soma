import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getMissionMember } from "@/features/crew/crew.queries";
import { CarePlanGenerator } from "@/features/plan/components/care-plan-generator";
import { ImmediateStepsView } from "@/features/plan/components/immediate-steps-view";
import { getImmediatePlan } from "@/features/plan/plan.queries";
import { selectionInputFromFlags } from "@/features/plan/plan.selection";
import { generatePlan } from "./actions";

export default function PlanPage({ params }: PageProps<"/reporte/[id]/plan">) {
  return (
    <Suspense fallback={<p className="text-ink">Cargando plan…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/reporte/[id]/plan">, "params">) {
  const member = await getMissionMember((await params).id);
  if (!member) notFound();

  const { immediateSteps } = await getImmediatePlan(
    selectionInputFromFlags(
      member.flags.map((flag) => flag.code),
      member.attention,
    ),
  );

  return (
    <div className="space-y-8">
      <ImmediateStepsView steps={immediateSteps} />
      <CarePlanGenerator action={generatePlan.bind(null, member.id)} />
    </div>
  );
}
