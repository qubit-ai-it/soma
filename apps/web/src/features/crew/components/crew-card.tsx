import type { Attention, MissionMemberDTO, Trend } from "../crew.types";
import { BodyPanel } from "./body-panel";

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

const TREND_META: Record<Trend, { symbol: string; label: string }> = {
  rising: { symbol: "↑", label: "Subiendo" },
  falling: { symbol: "↓", label: "Bajando" },
  stable: { symbol: "→", label: "Estable" },
  insufficient: { symbol: "–", label: "Datos insuficientes" },
};

export function CrewCard({ member }: { member: MissionMemberDTO }) {
  const attention = ATTENTION_STYLES[member.attention];
  return (
    <article className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
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

      <section aria-label="Tendencias" className="mt-4 text-sm">
        <h4 className="text-zinc-500">
          Tendencia ({member.history.length} registros)
        </h4>
        <ul className="mt-1 space-y-0.5">
          <TrendRow label="Frecuencia cardíaca" trend={member.trends.heartRate} />
          <TrendRow label="SpO₂" trend={member.trends.spo2} />
          <TrendRow label="Sueño" trend={member.trends.sleep} />
        </ul>
      </section>

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

      <BodyPanel memberName={member.name} zones={member.zones} />
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

function TrendRow({ label, trend }: { label: string; trend: Trend }) {
  const meta = TREND_META[trend];
  return (
    <li className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="font-medium">
        <span aria-hidden="true">{meta.symbol} </span>
        {meta.label}
      </span>
    </li>
  );
}
