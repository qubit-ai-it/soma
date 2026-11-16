import { SomaCard } from "@/shared/ui/soma-card";

export function SubjectMismatch({
  memberName,
  scenarioSubjectName,
  scenarioHref,
}: {
  memberName: string;
  scenarioSubjectName: string | null;
  scenarioHref: string | null;
}) {
  return (
    <SomaCard
      label="Evaluation unavailable"
      tone="info"
      chip="No data"
      title="No scenario for this crew member"
      line={`This data belongs to ${scenarioSubjectName ?? "another crew member"}, not ${memberName}.`}
      actions={
        scenarioHref
          ? [{ label: `View ${scenarioSubjectName}`, href: scenarioHref, icon: "arrow_forward" }]
          : undefined
      }
    />
  );
}
