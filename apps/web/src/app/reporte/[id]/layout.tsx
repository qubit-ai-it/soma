import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AttentionBadge } from "@/features/crew/components/attention-badge";
import { getMissionMember } from "@/features/crew/crew.queries";
import { ReportTabs } from "./report-tabs";

export default function ReportLayout({ children, params }: LayoutProps<"/reporte/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <Link href="/" className="text-sm underline-offset-4 hover:underline">
        ← Volver al resumen de misión
      </Link>
      <Suspense fallback={<p className="mt-6 text-zinc-500">Cargando reporte…</p>}>
        <ReportHeader params={params} />
      </Suspense>
      <div className="mt-6">{children}</div>
    </main>
  );
}

async function ReportHeader({ params }: Pick<LayoutProps<"/reporte/[id]">, "params">) {
  const { id } = await params;
  const member = await getMissionMember(id);
  if (!member) notFound();
  return (
    <>
      <header className="mt-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{member.name}</h1>
          <p className="text-zinc-600 dark:text-zinc-400">{member.role}</p>
        </div>
        <AttentionBadge attention={member.attention} />
      </header>
      <ReportTabs memberId={member.id} />
    </>
  );
}
