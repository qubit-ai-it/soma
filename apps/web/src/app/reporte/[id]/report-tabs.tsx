"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

const TABS = [
  { segment: null, label: "Resumen", path: "" },
  { segment: "tendencias", label: "Tendencias", path: "/tendencias" },
  { segment: "cuerpo", label: "Cuerpo", path: "/cuerpo" },
  { segment: "riesgo", label: "Riesgo", path: "/riesgo" },
  { segment: "plan", label: "Plan", path: "/plan" },
] as const;

export function ReportTabs({ memberId }: { memberId: string }) {
  const active = useSelectedLayoutSegment();
  return (
    <nav
      aria-label="Secciones del reporte"
      className="mt-6 border-b border-zinc-200 dark:border-zinc-800"
    >
      <ul className="flex gap-1">
        {TABS.map((tab) => {
          const isActive = tab.segment === active;
          return (
            <li key={tab.label}>
              <Link
                href={`/reporte/${memberId}${tab.path}`}
                aria-current={isActive ? "page" : undefined}
                className={`inline-block border-b-2 px-3 py-2 text-sm ${
                  isActive
                    ? "border-zinc-900 font-medium dark:border-zinc-100"
                    : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
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
