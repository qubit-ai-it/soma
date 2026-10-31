import type { MissionMemberDTO, Trend } from "../crew.types";

const TREND_META: Record<Trend, { symbol: string; label: string }> = {
  rising: { symbol: "↑", label: "Subiendo" },
  falling: { symbol: "↓", label: "Bajando" },
  stable: { symbol: "→", label: "Estable" },
  insufficient: { symbol: "–", label: "Datos insuficientes" },
};

const dateFormat = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

export function TrendsPanel({ member }: { member: MissionMemberDTO }) {
  const history = [...member.history].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return (
    <section aria-label="Tendencias" className="text-sm">
      <h3 className="text-zinc-500">Tendencia ({history.length} registros)</h3>
      <ul className="mt-1 space-y-0.5">
        <TrendRow label="Frecuencia cardíaca" trend={member.trends.heartRate} />
        <TrendRow label="SpO₂" trend={member.trends.spo2} />
        <TrendRow label="Sueño" trend={member.trends.sleep} />
      </ul>

      <h3 className="mt-6 text-zinc-500">Historial</h3>
      {history.length > 0 ? (
        <table className="mt-2 w-full text-left">
          <thead className="text-zinc-500">
            <tr>
              <th scope="col" className="py-1 font-normal">Fecha</th>
              <th scope="col" className="py-1 font-normal">FC (lpm)</th>
              <th scope="col" className="py-1 font-normal">SpO₂ (%)</th>
              <th scope="col" className="py-1 font-normal">Sueño (h)</th>
            </tr>
          </thead>
          <tbody>
            {history.map((sample) => (
              <tr key={sample.at} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="py-1">{dateFormat.format(new Date(sample.at))}</td>
                <td className="py-1">{sample.heartRateBpm}</td>
                <td className="py-1">{sample.spo2Pct}</td>
                <td className="py-1">{sample.sleepHours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-2">Sin historial registrado.</p>
      )}
      <p className="mt-6 text-xs text-zinc-500">
        Tendencias ilustrativas, no clínicas. Requiere validación humana.
      </p>
    </section>
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
