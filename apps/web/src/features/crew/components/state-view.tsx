import { RiskPanel } from "@/features/risk/components/risk-panel";
import type { RiskBadgeDTO } from "@/features/risk/risk.types";

import { RESTING_HEART_RATE, THRESHOLDS } from "../crew.logic";
import type { MissionMemberDTO } from "../crew.types";
import { BodyPanel } from "./body-panel";
import { HeartRateCard } from "./heart-rate-card";
import { HeartViewer } from "./heart-viewer";
import { LungsViewer } from "./lungs-viewer";
import { OxygenCard } from "./oxygen-card";
import { SeverityLegend } from "./severity-legend";
import { TrendCard } from "./trend-card";

const TITLE = "font-heading text-xl font-bold";
const PANEL = "rounded-[2rem_1.5rem_2.25rem_1.75rem] bg-card";

const day = new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", timeZone: "UTC" });

export function StateView({ member, risk }: { member: MissionMemberDTO; risk: RiskBadgeDTO | null }) {
  const history = [...member.history].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const series = (pick: (sample: (typeof history)[number]) => number) =>
    history.map((sample) => ({ at: sample.at, value: pick(sample) }));

  return (
    <div className="space-y-12">
      <section aria-labelledby="body-risk" className="space-y-4">
        <h3 id="body-risk" className={TITLE}>
          Cuerpo y riesgo
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={`${PANEL} p-6`}>
            <SeverityLegend />
            <BodyPanel memberName={member.name} zones={member.zones} />
          </div>
          <RiskPanel risk={risk} />
        </div>
      </section>

      <section aria-labelledby="trends" className="space-y-4">
        <h3 id="trends" className={TITLE}>
          Tendencias
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <TrendCard
            title="Frecuencia cardíaca"
            unit="lpm"
            icon="cardiology"
            samples={series((s) => s.heartRateBpm)}
            range={RESTING_HEART_RATE}
            trend={member.trends.heartRate}
          />
          <TrendCard
            title="SpO₂"
            unit="%"
            icon="pulmonology"
            samples={series((s) => s.spo2Pct)}
            range={{ low: THRESHOLDS.minSpo2Pct }}
            trend={member.trends.spo2}
          />
          <TrendCard
            title="Sueño"
            unit="h"
            icon="bedtime"
            samples={series((s) => s.sleepHours)}
            range={{ low: THRESHOLDS.minSleepHours }}
            trend={member.trends.sleep}
            digits={1}
          />
        </div>

        {history.length > 0 && (
          <details className="rounded-2xl bg-card p-4 text-sm">
            <summary className="cursor-pointer list-none text-ink outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              Ver los {history.length} registros
            </summary>
            <table className="mt-3 w-full text-left">
              <thead className="text-ink">
                <tr>
                  <th scope="col" className="px-3 py-2 font-normal">Fecha</th>
                  <th scope="col" className="px-3 py-2 font-normal">FC (lpm)</th>
                  <th scope="col" className="px-3 py-2 font-normal">SpO₂ (%)</th>
                  <th scope="col" className="px-3 py-2 font-normal">Sueño (h)</th>
                </tr>
              </thead>
              <tbody>
                {history.map((sample) => (
                  <tr key={sample.at} className="odd:bg-secondary/40">
                    <td className="px-3 py-2">{day.format(new Date(sample.at))}</td>
                    <td className="px-3 py-2">{sample.heartRateBpm}</td>
                    <td className="px-3 py-2">{sample.spo2Pct}</td>
                    <td className="px-3 py-2">{sample.sleepHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </section>

      <section aria-labelledby="organs" className="space-y-4">
        <h3 id="organs" className={TITLE}>
          Corazón y pulmones
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            <div className={`${PANEL} relative min-h-[24rem] overflow-hidden`}>
              <HeartViewer />
            </div>
            <HeartRateCard bpm={member.vitals.heartRateBpm} trend={member.trends.heartRate} />
          </div>
          <div className="grid gap-4">
            <div className={`${PANEL} relative min-h-[24rem] overflow-hidden`}>
              <LungsViewer />
            </div>
            <OxygenCard spo2={member.vitals.spo2Pct} trend={member.trends.spo2} />
          </div>
        </div>
      </section>
    </div>
  );
}
