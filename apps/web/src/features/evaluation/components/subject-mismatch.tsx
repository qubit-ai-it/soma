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
      label="Evaluación no disponible"
      tone="info"
      chip="Sin datos"
      title="Sin escenario para este miembro"
      line={`Estos datos son de ${scenarioSubjectName ?? "otro miembro"}, no de ${memberName}.`}
      actions={
        scenarioHref
          ? [{ label: `Ver a ${scenarioSubjectName}`, href: scenarioHref, icon: "arrow_forward" }]
          : undefined
      }
    />
  );
}
