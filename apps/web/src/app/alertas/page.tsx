import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { verifyChain } from "@/features/alerts/audit.logic";
import { getEcosystem } from "@/features/earth/ecosystem.server";
import { RoleSwitcher } from "@/features/roles/components/role-switcher";
import { Icon } from "@/shared/ui/icon";

import { AlertsBoard } from "./alerts-board";

export const metadata = { title: "Alertas y auditoría · Soma" };

export default function AlertsPage() {
  return (
    <main className="container-soma flex-1 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-ink transition-colors duration-[var(--duration-micro)] hover:text-foreground"
      >
        <Icon name="arrow_back" />
        Volver
      </Link>
      <h1 className="reveal mt-8 text-headline">Alertas</h1>
      <p className="mt-2 text-xs text-ink">Demostración · datos sintéticos</p>
      <div className="mt-6">
        <RoleSwitcher />
      </div>
      <div className="mt-8">
        <Suspense fallback={<p className="text-ink">Cargando alertas…</p>}>
          <Board />
        </Suspense>
      </div>
    </main>
  );
}

async function Board() {
  await connection();
  const { alertsRepo, audit } = getEcosystem();
  const [alerts, entries] = await Promise.all([alertsRepo.list(), audit.list()]);
  return <AlertsBoard alerts={alerts} entries={entries} chainValid={verifyChain(entries).valid} />;
}
