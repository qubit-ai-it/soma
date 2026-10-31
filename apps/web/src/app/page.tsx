import { Suspense } from "react";

import { CrewSection } from "@/features/crew/components/crew-section";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Soma</h1>
      <p className="mb-10 mt-2 text-zinc-600 dark:text-zinc-400">
        Prototipo de monitoreo de salud de la tripulación.
      </p>
      <Suspense fallback={<p className="text-zinc-500">Cargando tripulación…</p>}>
        <CrewSection />
      </Suspense>
    </main>
  );
}
