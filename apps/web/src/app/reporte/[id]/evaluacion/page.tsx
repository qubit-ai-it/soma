import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getMissionMember } from "@/features/crew/crew.queries";
import { EvaluationExplorer } from "@/features/evaluation/components/evaluation-explorer";
import { SubjectMismatch } from "@/features/evaluation/components/subject-mismatch";
import { matchesSubject } from "@/features/evaluation/evaluation.logic";
import { getEvaluationBoard } from "@/features/evaluation/evaluation.queries";
import { SentryEvaluationCard } from "@/features/sentry/components/sentry-evaluation-card";
import { getStoredEvaluation } from "@/features/sentry/sentry.queries";

export default function EvaluationPage({ params }: PageProps<"/reporte/[id]/evaluacion">) {
  return (
    <Suspense fallback={<p className="text-ink">Evaluando…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/reporte/[id]/evaluacion">, "params">) {
  const { id } = await params;
  const member = await getMissionMember(id);
  if (!member) notFound();

  const board = await getEvaluationBoard();
  const scenarios = board.scenarios.filter((scenario) => matchesSubject(scenario, id));
  const stored = await getStoredEvaluation(id);
  const sentryCard = stored ? (
    <SentryEvaluationCard evaluation={stored.evaluation} nowMs={stored.nowMs} />
  ) : null;

  if (scenarios.length === 0) {
    const subjectId = board.scenarios[0]?.subjectId;
    const subject = subjectId ? await getMissionMember(subjectId) : null;
    return (
      <div className="flex flex-col gap-6">
        {sentryCard}
        <SubjectMismatch
          memberName={member.name}
          scenarioSubjectName={subject?.name ?? null}
          scenarioHref={subject ? `/reporte/${subject.id}/evaluacion` : null}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sentryCard}
      <EvaluationExplorer board={{ scenarios }} />
    </div>
  );
}
