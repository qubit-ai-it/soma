import Link from "next/link";
import type { ReactNode } from "react";

import type { CrewSummaryDTO } from "../crew.types";
import { AttentionBadge } from "./attention-badge";
import { SEVERITY_META } from "./severity";

export function CrewSummaryList({
  crew,
  hrefFor,
  riskSlots = {},
}: {
  crew: CrewSummaryDTO[];
  hrefFor: (id: string) => string;
  riskSlots?: Record<string, ReactNode>;
}) {
  return (
    <section aria-labelledby="crew-heading">
      <h2 id="crew-heading" className="mb-6 text-headline">
        Tripulación
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {crew.map((member) => (
          <li key={member.id} className="reveal">
            <Link
              href={hrefFor(member.id)}
              className="flex h-full flex-col gap-4 rounded-md bg-card p-5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-editorial)] hover:bg-secondary focus-visible:bg-secondary"
            >
              <div>
                <p className="font-heading text-xl font-bold">{member.name}</p>
                <p className="text-sm text-ink">{member.role}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AttentionBadge attention={member.attention} />
                {riskSlots[member.id]}
              </div>
              <p className="mt-auto text-sm text-muted-foreground">
                {member.primarySignal
                  ? `${member.primarySignal.label}: ${member.primarySignal.value} ${member.primarySignal.unit} (${SEVERITY_META[member.primarySignal.severity].label})`
                  : "Sin señales fuera de rango"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-ink">
        Demostración · Fuente: Sintética. Los umbrales son ilustrativos, no clínicos ni
        orientación médica.
      </p>
    </section>
  );
}
