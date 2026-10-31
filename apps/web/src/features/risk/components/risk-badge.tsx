import { describeSource, RISK_LEVEL_LABEL } from "../risk.display";
import type { RiskBadgeDTO } from "../risk.types";
import { LEVEL_STYLES } from "./risk-styles";

export function RiskBadge({ risk }: { risk: RiskBadgeDTO | null }) {
  if (!risk) return <span className="text-xs text-zinc-500">Riesgo no disponible</span>;

  const source = describeSource(risk);
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className={`rounded-full px-3 py-1 text-xs font-medium ${LEVEL_STYLES[risk.level].badge}`}
      >
        Riesgo {RISK_LEVEL_LABEL[risk.level]}
      </span>
      {source.badge && (
        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          {source.badge}
        </span>
      )}
      {risk.lowConfidence && (
        <span className="text-xs font-medium text-violet-800 dark:text-violet-300">
          Confianza baja
        </span>
      )}
    </span>
  );
}
