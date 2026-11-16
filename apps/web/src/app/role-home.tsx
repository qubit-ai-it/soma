"use client";

import type { ReactNode } from "react";

import { CrewSummaryList } from "@/features/crew/components/crew-summary-list";
import type { CrewSummaryDTO } from "@/features/crew/crew.types";
import { DEMO_ACTORS, buildOperationalSummary } from "@/features/roles/roles.logic";
import { homeKind, selectHomeCrew } from "@/features/roles/roles.home";
import { useDemoRole } from "@/features/roles/roles.store";
import type { Level } from "@/features/roles/roles.types";
import { SomaCard } from "@/shared/ui/soma-card";

type Props = {
  crew: CrewSummaryDTO[];
  riskSlots: Record<string, ReactNode>;
  levels: { memberId: string; level: Level }[];
  f3Open: number;
};

const hrefFor = (id: string) => `/report/${id}`;

export function RoleHome({ crew, riskSlots, levels, f3Open }: Props) {
  const role = useDemoRole();
  const kind = homeKind(role);

  if (kind === "self" || kind === "review") {
    const visible = selectHomeCrew(role, crew, DEMO_ACTORS.astronaut.memberId ?? "");
    return (
      <>
        <CrewSummaryList
          crew={visible}
          hrefFor={hrefFor}
          riskSlots={riskSlots}
          heading={kind === "self" ? "Tu reporte" : "Tripulación"}
        />
        <p className="mt-2 text-xs text-ink">
          La clasificación de riesgo requiere validación humana; no es un diagnóstico.
        </p>
      </>
    );
  }

  if (kind === "operational") {
    const { total, availability } = buildOperationalSummary(levels);
    const tone =
      availability.unavailable > 0 ? "danger" : availability.limited > 0 ? "warn" : "ok";
    return (
      <section aria-label="Resumen operativo" className="grid gap-4 sm:grid-cols-2">
        <SomaCard
          title={`${availability.available} de ${total} disponibles`}
          line={`${availability.limited} limitados · ${availability.unavailable} no disponibles`}
          chip="Tripulación"
          tone={tone}
          detail={<p>Sin detalle clínico: solo disponibilidad operativa.</p>}
        />
      </section>
    );
  }

  return (
    <section aria-label="Resumen para Tierra" className="grid gap-4 sm:grid-cols-2">
      <SomaCard
        title="Consola de Tierra"
        line="Revisa las propuestas pendientes."
        chip="Tierra"
        tone="info"
        actions={[{ label: "Abrir consola", icon: "public", href: "/earth" }]}
      />
      <SomaCard
        title={f3Open === 0 ? "Sin alertas F3" : `${f3Open} alertas F3`}
        line={f3Open === 0 ? "Nada urgente por ahora." : "Requieren acción inmediata."}
        chip="Alertas"
        tone={f3Open === 0 ? "ok" : "danger"}
      />
    </section>
  );
}
