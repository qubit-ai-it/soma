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
      <h2 id="crew-heading" className="mb-4 text-xl font-semibold">
        Tripulación
      </h2>
      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {crew.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
            <div className="min-w-40 flex-1">
              <Link
                href={hrefFor(member.id)}
                className="font-semibold underline-offset-4 hover:underline"
              >
                {member.name}
              </Link>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{member.role}</p>
            </div>
            <AttentionBadge attention={member.attention} />
            {riskSlots[member.id]}
            <p className="w-full text-sm text-zinc-600 sm:w-auto sm:min-w-48 dark:text-zinc-400">
              {member.primarySignal
                ? `${member.primarySignal.label}: ${member.primarySignal.value} ${member.primarySignal.unit} (${SEVERITY_META[member.primarySignal.severity].label})`
                : "Sin señales fuera de rango"}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-zinc-500">
        Datos de demostración desde JSON local. Los umbrales son ilustrativos, no clínicos ni
        orientación médica.
      </p>
    </section>
  );
}
