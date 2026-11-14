import { Icon } from "@/shared/ui/icon";
import type { MissionMemberDTO, Trend } from "../crew.types";

const TREND_META: Record<Trend, { symbol: string; label: string }> = {
  rising: { symbol: "trending_up", label: "Subiendo" },
  falling: { symbol: "trending_down", label: "Bajando" },
  stable: { symbol: "trending_flat", label: "Estable" },
  insufficient: { symbol: "remove", label: "Datos insuficientes" },
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
      <h3 className="text-xl">Tendencia ({history.length} registros)</h3>
      <ul className="mt-3 space-y-2">
        <TrendRow label="Frecuencia cardíaca" trend={member.trends.heartRate} />
        <TrendRow label="SpO₂" trend={member.trends.spo2} />
        <TrendRow label="Sueño" trend={member.trends.sleep} />
      </ul>

      <h3 className="mt-10 text-xl">Historial</h3>
      {history.length > 0 ? (
        <table className="mt-3 w-full overflow-hidden rounded-md bg-card text-left">
          <thead className="bg-secondary text-ink">
            <tr>
              <th scope="col" className="px-4 py-2 font-normal">Fecha</th>
              <th scope="col" className="px-4 py-2 font-normal">FC (lpm)</th>
              <th scope="col" className="px-4 py-2 font-normal">SpO₂ (%)</th>
              <th scope="col" className="px-4 py-2 font-normal">Sueño (h)</th>
            </tr>
          </thead>
          <tbody>
            {history.map((sample) => (
              <tr key={sample.at} className="odd:bg-muted">
                <td className="px-4 py-2">{dateFormat.format(new Date(sample.at))}</td>
                <td className="px-4 py-2">{sample.heartRateBpm}</td>
                <td className="px-4 py-2">{sample.spo2Pct}</td>
                <td className="px-4 py-2">{sample.sleepHours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-2 text-muted-foreground">Sin historial registrado.</p>
      )}
      <p className="mt-8 text-xs text-ink">
        Tendencias ilustrativas, no clínicas. Requiere validación humana.
      </p>
    </section>
  );
}

function TrendRow({ label, trend }: { label: string; trend: Trend }) {
  const meta = TREND_META[trend];
  return (
    <li className="flex items-center justify-between gap-2 rounded-md bg-card px-4 py-3">
      <span>{label}</span>
      <span className="font-medium">
        <Icon name={meta.symbol} className="mr-1 align-middle" />
        {meta.label}
      </span>
    </li>
  );
}
