import { Suspense } from "react";

import { escalateLiveAlert } from "@/features/live/live.actions";
import { LiveReading } from "@/features/live/components/live-reading";
import { ExternalSection } from "@/features/space-weather/components/external-section";
import { DEMO_ACTORS } from "@/features/roles/roles.logic";
import { MetricCard } from "@/shared/ui/metric-card";

import { flagCards } from "../crew.flags";

import type { MissionMemberDTO } from "../crew.types";

const MISSION_SENSORS = "Mission sensors";
const SECTION_TITLE = "font-heading text-xl font-bold";

export function VitalsSummary({ member }: { member: MissionMemberDTO }) {
  // The connected watch or band belongs to the astronaut using this device
  const hasLive = member.id === DEMO_ACTORS.astronaut.memberId;
  const cards = flagCards(member);

  return (
    <div className="space-y-10">
      <section aria-labelledby="sensors" className="space-y-4">
        <h3 id="sensors" className={SECTION_TITLE}>
          Devices and sensors
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Heart rate"
            value={`${member.vitals.heartRateBpm} bpm`}
            icon="cardiology"
            source={MISSION_SENSORS}
          />
          <MetricCard title="SpO₂" value={`${member.vitals.spo2Pct} %`} icon="pulmonology" source={MISSION_SENSORS} />
          <MetricCard title="Sleep" value={`${member.vitals.sleepHours} h`} icon="bedtime" source={MISSION_SENSORS} />
          <MetricCard
            title="Cumulative dose"
            value={`${member.cumulativeDoseMsv} mSv`}
            line="Personal dose"
            icon="radiology"
            source="Personal dosimeter"
          />
          {hasLive && <LiveReading escalate={escalateLiveAlert} />}
        </div>
      </section>

      <section aria-labelledby="external" className="space-y-4">
        <h3 id="external" className={SECTION_TITLE}>
          External information
        </h3>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading NASA data…</p>}>
          <ExternalSection />
        </Suspense>
      </section>

      <section aria-labelledby="flags" className="space-y-3">
        <h3 id="flags" className={SECTION_TITLE}>
          Flags
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.length > 0 ? (
            cards.map((card) => (
              <MetricCard
                key={card.code}
                title={card.title}
                value={card.value}
                line={card.line}
                icon={card.icon}
                tone={card.tone}
              />
            ))
          ) : (
            <MetricCard title="Flags" value="No flags" line="Everything within range" icon="check_circle" tone="ok" />
          )}
        </div>
      </section>
    </div>
  );
}
