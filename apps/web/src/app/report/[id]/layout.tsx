import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Icon } from "@/shared/ui/icon";

import { AttentionBadge } from "@/features/crew/components/attention-badge";
import { getMissionMember } from "@/features/crew/crew.queries";
import { ReportTabs } from "./report-tabs";

export default function ReportLayout({ children, params }: LayoutProps<"/report/[id]">) {
  return (
    <main className="container-soma flex-1 py-16">
      <Link href="/mission" className="inline-flex items-center gap-2 text-sm text-ink transition-colors duration-[var(--duration-micro)] hover:text-foreground">
        <Icon name="arrow_back" />
        Volver al resumen de misión
      </Link>
      <Suspense fallback={<p className="mt-6 text-ink">Cargando reporte…</p>}>
        <ReportHeader params={params} />
      </Suspense>
      <div className="mt-8">{children}</div>
    </main>
  );
}

async function ReportHeader({ params }: Pick<LayoutProps<"/report/[id]">, "params">) {
  const { id } = await params;
  const member = await getMissionMember(id);
  if (!member) notFound();
  return (
    <>
      <header className="reveal mt-8 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-headline">{member.name}</h1>
          <p className="mt-1 text-ink">{member.role}</p>
        </div>
        <AttentionBadge attention={member.attention} />
      </header>
      <ReportTabs memberId={member.id} />
    </>
  );
}
