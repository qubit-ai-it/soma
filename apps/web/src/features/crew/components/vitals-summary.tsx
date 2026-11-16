import { escalateLiveAlert } from "@/features/live/live.actions";
import { LiveReading } from "@/features/live/components/live-reading";
import { DEMO_ACTORS } from "@/features/roles/roles.logic";
import { MetricCard } from "@/shared/ui/metric-card";

import type { MissionMemberDTO } from "../crew.types";

const SECTION_TITLE = "font-heading text-xl font-bold";

export function VitalsSummary({ member }: { member: MissionMemberDTO }) {
  // The connected watch or band belongs to the astronaut using this device
  const hasLive = member.id === DEMO_ACTORS.astronaut.memberId;

  return (
    <div className="space-y-10">
      <section aria-labelledby="vitals" className="space-y-4">
        <h3 id="vitals" className={SECTION_TITLE}>
          Signos vitales
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Frecuencia cardíaca" value={`${member.vitals.heartRateBpm} lpm`} icon="cardiology" />
          <MetricCard title="SpO₂" value={`${member.vitals.spo2Pct} %`} icon="pulmonology" />
          <MetricCard title="Sueño" value={`${member.vitals.sleepHours} h`} icon="bedtime" />
          <MetricCard title="Dosis acumulada" value={`${member.cumulativeDoseMsv} mSv`} icon="radiology" />
        </div>
      </section>

      {hasLive && (
        <section aria-labelledby="live" className="space-y-4">
          <h3 id="live" className={SECTION_TITLE}>
            En vivo
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <LiveReading escalate={escalateLiveAlert} />
          </div>
          <p className="text-xs text-ink">Lecturas de tu dispositivo, no son un diagnóstico.</p>
        </section>
      )}

      <section aria-labelledby="flags" className="space-y-3">
        <h3 id="flags" className={SECTION_TITLE}>
          Banderas
        </h3>
        {member.flags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {member.flags.map((flag) => (
              <li key={flag.code} className="rounded-full bg-card px-3 py-1 text-xs">
                {flag.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin banderas.</p>
        )}
        <p className="pt-3 text-xs text-ink">Umbrales ilustrativos, no clínicos. Requiere validación humana.</p>
      </section>
    </div>
  );
}
