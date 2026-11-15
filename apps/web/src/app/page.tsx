import Link from "next/link";
import { Suspense } from "react";

import { MissionSection } from "./mission-section";

export default function Home() {
  return (
    <main className="container-soma flex-1 py-16">
      <h1 className="reveal mb-6 text-display">Soma</h1>
      <nav aria-label="Secciones de SOMA" className="mb-12">
        <ul className="flex flex-wrap gap-2">
          {[
            { href: "/demo", label: "Demo guiada" },
            { href: "/xr", label: "XR" },
            { href: "/tierra", label: "Tierra" },
            { href: "/alertas", label: "Alertas" },
            { href: "/pet", label: "Sentry" },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-block rounded-full bg-card px-4 py-2 font-heading text-sm font-semibold hover:bg-secondary"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Suspense fallback={<p className="text-ink">Cargando tripulación…</p>}>
        <MissionSection />
      </Suspense>
    </main>
  );
}
