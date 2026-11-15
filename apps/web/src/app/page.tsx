import { Suspense } from "react";

import { MissionSection } from "./mission-section";

export default function Home() {
  return (
    <main className="container-soma flex-1 py-12">
      <h1 className="reveal mb-10 text-display">Soma</h1>
      <Suspense fallback={<p className="text-ink">Cargando tripulación…</p>}>
        <MissionSection />
      </Suspense>
    </main>
  );
}
