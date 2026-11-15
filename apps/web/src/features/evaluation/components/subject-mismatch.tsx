import Link from "next/link";

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
    <section aria-label="Evaluación no disponible" className="rounded-md bg-card p-5 text-sm">
      <h3 className="text-xl">Sin escenario para este miembro</h3>
      <p className="mt-2">
        Los escenarios sintéticos de la demostración pertenecen a{" "}
        <span className="font-medium">{scenarioSubjectName ?? "otro miembro de la tripulación"}</span>
        , no a {memberName}. SOMA no evalúa a {memberName} con datos de otra persona.
      </p>
      {scenarioHref && (
        <p className="mt-3">
          <Link href={scenarioHref} className="underline underline-offset-4">
            Ver la evaluación de {scenarioSubjectName}
          </Link>
        </p>
      )}
      <p className="mt-4 text-xs text-ink">
        Datos sintéticos y reglas de demostración. Sin datos no hay evaluación.
      </p>
    </section>
  );
}
