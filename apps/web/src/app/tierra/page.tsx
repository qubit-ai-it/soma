import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { getEcosystem } from "@/features/earth/ecosystem.server";
import { RoleGate } from "@/features/roles/components/role-gate";
import { RoleSwitcher } from "@/features/roles/components/role-switcher";
import { Icon } from "@/shared/ui/icon";

import { EarthConsole } from "./earth-console";

export const metadata = { title: "Consola de Tierra · Soma" };

export default function EarthPage() {
  return (
    <main className="container-soma flex-1 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-ink transition-colors duration-[var(--duration-micro)] hover:text-foreground"
      >
        <Icon name="arrow_back" />
        Volver
      </Link>
      <h1 className="reveal mt-8 text-headline">Consola de Tierra</h1>
      <div className="mt-6">
        <RoleSwitcher />
      </div>
      <div className="mt-8">
        <RoleGate resource="earth_console">
          <Suspense fallback={<p className="text-ink">Cargando consola…</p>}>
            <Console />
          </Suspense>
        </RoleGate>
      </div>
    </main>
  );
}

async function Console() {
  await connection();
  const state = await getEcosystem().earth.getState();
  return <EarthConsole state={state} />;
}
