import type { MissionMemberDTO } from "../crew.types";

export function VitalsSummary({ member }: { member: MissionMemberDTO }) {
  return (
    <section aria-label="Signos vitales actuales">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Frecuencia cardíaca" value={`${member.vitals.heartRateBpm} lpm`} />
        <Metric label="SpO₂" value={`${member.vitals.spo2Pct} %`} />
        <Metric label="Sueño" value={`${member.vitals.sleepHours} h`} />
        <Metric label="Dosis acumulada" value={`${member.cumulativeDoseMsv} mSv`} />
      </dl>

      <h3 className="mt-10 text-xl">Banderas</h3>
      {member.flags.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {member.flags.map((flag) => (
            <li
              key={flag.code}
              className="rounded-full bg-card px-3 py-1 text-xs"
            >
              {flag.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Sin banderas.</p>
      )}
      <p className="mt-8 text-xs text-ink">
        Umbrales ilustrativos, no clínicos. Requiere validación humana.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-card p-5">
      <dt className="text-sm text-ink">{label}</dt>
      <dd className="mt-2 font-heading text-2xl font-bold">{value}</dd>
    </div>
  );
}
