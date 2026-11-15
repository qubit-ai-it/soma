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
                className="inline-flex h-12 items-center rounded-full bg-card px-6 font-heading text-base font-semibold outline-none transition-colors duration-[var(--duration-micro)] hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
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
