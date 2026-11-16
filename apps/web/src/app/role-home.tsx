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

const hrefFor = (id: string) => `/reporte/${id}`;

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
          heading={kind === "self" ? "Your report" : "Crew"}
        />
        <p className="mt-2 text-xs text-ink">
          Risk classification requires human review; it is not a diagnosis.
        </p>
      </>
    );
  }

  if (kind === "operational") {
    const { total, availability } = buildOperationalSummary(levels);
    const tone =
      availability.unavailable > 0 ? "danger" : availability.limited > 0 ? "warn" : "ok";
    return (
      <section aria-label="Operational summary" className="grid gap-4 sm:grid-cols-2">
        <SomaCard
          title={`${availability.available} of ${total} available`}
          line={`${availability.limited} limited · ${availability.unavailable} unavailable`}
          chip="Crew"
          tone={tone}
          detail={<p>No clinical details: operational availability only.</p>}
        />
      </section>
    );
  }

  return (
    <section aria-label="Earth summary" className="grid gap-4 sm:grid-cols-2">
      <SomaCard
        title="Earth console"
        line="Review pending proposals."
        chip="Earth"
        tone="info"
        actions={[{ label: "Open console", icon: "public", href: "/tierra" }]}
      />
      <SomaCard
        title={f3Open === 0 ? "No F3 alerts" : `${f3Open} F3 alerts`}
        line={f3Open === 0 ? "Nothing urgent at this time." : "Immediate action required."}
        chip="Alerts"
        tone={f3Open === 0 ? "ok" : "danger"}
      />
    </section>
  );
}
