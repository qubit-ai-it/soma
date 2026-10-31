import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BodyPanel } from "@/features/crew/components/body-panel";
import { SeverityLegend } from "@/features/crew/components/severity-legend";
import { getMissionMember } from "@/features/crew/crew.queries";

export default function BodyPage({ params }: PageProps<"/reporte/[id]/cuerpo">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Cargando mapa corporal…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/reporte/[id]/cuerpo">, "params">) {
  const member = await getMissionMember((await params).id);
  if (!member) notFound();
  return (
    <section aria-label="Mapa corporal">
      <SeverityLegend />
      <BodyPanel memberName={member.name} zones={member.zones} />
      <p className="mt-4 text-xs text-zinc-500">
        El mapa corporal es ilustrativo, no clínico ni orientación médica. Requiere validación
        humana.
      </p>
    </section>
  );
}
