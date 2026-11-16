"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

const TABS = [
  { segment: null, label: "Resumen", path: "" },
  { segment: "status", label: "Estado", path: "/status" },
  { segment: "evaluation", label: "Evaluación", path: "/evaluation" },
  { segment: "plan", label: "Plan", path: "/plan" },
  { segment: "follow-up", label: "Seguimiento", path: "/follow-up" },
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
                href={`/report/${memberId}${tab.path}`}
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
