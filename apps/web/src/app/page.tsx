import { Suspense } from "react";
import Link from "next/link";

import { MissionSection } from "./mission-section";

export default function Home() {
  return (
    <main className="container-soma flex-1 py-16">
      <div className="reveal mb-12 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-display">Soma</h1>
        <Link href="/simulacion" className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10">
          Simulación de tripulación
        </Link>
      </div>
      <Suspense fallback={<p className="text-ink">Cargando tripulación…</p>}>
        <MissionSection />
      </Suspense>
    </main>
  );
}
