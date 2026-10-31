import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TrendsPanel } from "@/features/crew/components/trends-panel";
import { getMissionMember } from "@/features/crew/crew.queries";

export default function TrendsPage({ params }: PageProps<"/reporte/[id]/tendencias">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Cargando tendencias…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/reporte/[id]/tendencias">, "params">) {
  const member = await getMissionMember((await params).id);
  if (!member) notFound();
  return <TrendsPanel member={member} />;
}
