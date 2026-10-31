import type { MissionMemberDTO } from "../crew.types";

export function VitalsSummary({ member }: { member: MissionMemberDTO }) {
  return (
    <section aria-label="Signos vitales actuales">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Metric label="Frecuencia cardíaca" value={`${member.vitals.heartRateBpm} lpm`} />
        <Metric label="SpO₂" value={`${member.vitals.spo2Pct} %`} />
        <Metric label="Sueño" value={`${member.vitals.sleepHours} h`} />
        <Metric label="Dosis acumulada" value={`${member.cumulativeDoseMsv} mSv`} />
      </dl>

      <h3 className="mt-6 text-sm text-zinc-500">Banderas</h3>
      {member.flags.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {member.flags.map((flag) => (
            <li
              key={flag.code}
              className="rounded-md bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-900"
            >
              {flag.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm">Sin banderas.</p>
      )}
      <p className="mt-6 text-xs text-zinc-500">
        Umbrales ilustrativos, no clínicos. Requiere validación humana.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
