import { Suspense } from "react";
import Link from "next/link";

import { MissionSection } from "../mission-section";

export const metadata = { title: "Mission dashboard · Soma" };

export default function MissionPage() {
  return (
    <main className="container-soma flex-1 py-12">
      <div className="reveal mb-10 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-display">Soma</h1>
        <Link href="/" className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10">
          Crew simulation
        </Link>
      </div>
      <Suspense fallback={<p className="text-ink">Loading crew…</p>}>
        <MissionSection />
      </Suspense>
    </main>
  );
}
