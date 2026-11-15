"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

const TABS = [
  { segment: null, label: "Resumen", path: "" },
  { segment: "tendencias", label: "Tendencias", path: "/tendencias" },
  { segment: "cuerpo", label: "Cuerpo", path: "/cuerpo" },
  { segment: "riesgo", label: "Riesgo", path: "/riesgo" },
  { segment: "evaluacion", label: "Evaluación", path: "/evaluacion" },
  { segment: "plan", label: "Plan", path: "/plan" },
  { segment: "seguimiento", label: "Seguimiento", path: "/seguimiento" },
] as const;

export function ReportTabs({ memberId }: { memberId: string }) {
  const active = useSelectedLayoutSegment();
  return (
    <nav
      aria-label="Secciones del reporte"
      className="mt-8"
    >
      <ul className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = tab.segment === active;
          return (
            <li key={tab.label}>
              <Link
                href={`/reporte/${memberId}${tab.path}`}
                aria-current={isActive ? "page" : undefined}
                className={`inline-block rounded-full px-4 py-2 font-heading text-sm font-semibold transition-colors duration-[var(--duration-micro)] ease-[var(--ease-editorial)] ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-secondary"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
