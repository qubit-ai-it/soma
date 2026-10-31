import type { Attention, CrewCardDTO } from "../crew.types";

const ATTENTION_STYLES: Record<Attention, { label: string; className: string }> = {
  nominal: {
    label: "Nominal",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  watch: {
    label: "Vigilar",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  review: {
    label: "Revisar",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

export function CrewCard({ member }: { member: CrewCardDTO }) {
  const attention = ATTENTION_STYLES[member.attention];
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{member.name}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{member.role}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${attention.className}`}
        >
          {attention.label}
        </span>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Frecuencia cardíaca" value={`${member.vitals.heartRateBpm} lpm`} />
        <Metric label="SpO₂" value={`${member.vitals.spo2Pct} %`} />
        <Metric label="Sueño" value={`${member.vitals.sleepHours} h`} />
        <Metric label="Dosis acumulada" value={`${member.cumulativeDoseMsv} mSv`} />
      </dl>

      {member.flags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {member.flags.map((flag) => (
            <li
              key={flag.code}
              className="rounded-md bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-900"
            >
              {flag.label}
            </li>
          ))}
        </ul>
      )}
    </article>
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
