import type { ReactNode } from "react";

import type { MissionMemberDTO, Severity } from "../crew.types";
import { CrewCard } from "./crew-card";
import { SEVERITY_META } from "./severity";

export function CrewSection({
  crew,
  badges = {},
}: {
  crew: MissionMemberDTO[];
  badges?: Record<string, ReactNode>;
}) {
  return (
    <section aria-labelledby="crew-heading">
      <h2 id="crew-heading" className="mb-4 text-xl font-semibold">
        Tripulación
      </h2>
      <ul
        aria-label="Leyenda de gravedad"
        className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm"
      >
        {(Object.keys(SEVERITY_META) as Severity[]).map((key) => (
          <li key={key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`inline-block size-3 rounded-sm ${SEVERITY_META[key].swatch}`}
            />
            {SEVERITY_META[key].label}
          </li>
        ))}
      </ul>
      <div className="grid gap-4 sm:grid-cols-2">
        {crew.map((member) => (
          <CrewCard key={member.id} member={member} riskSlot={badges[member.id]} />
        ))}
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        Datos de demostración desde JSON local. Los umbrales y el mapa corporal son
        ilustrativos, no clínicos ni orientación médica.
      </p>
    </section>
  );
}
