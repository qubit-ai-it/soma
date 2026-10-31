import type { RiskLevel } from "../classifier.port";
import { describeSource, RISK_LEVEL_LABEL } from "../risk.display";
import type { RiskBadgeDTO } from "../risk.types";
import { LEVEL_STYLES } from "./risk-styles";

const LEVELS: RiskLevel[] = ["low", "moderate", "high"];

const pct = (value: number) => `${Math.round(value * 100)} %`;

export function RiskPanel({ risk }: { risk: RiskBadgeDTO | null }) {
  if (!risk) {
    return (
      <section aria-label="Clasificación de riesgo" className="text-sm text-zinc-500">
        Clasificación de riesgo no disponible.
      </section>
    );
  }

  const source = describeSource(risk);
  return (
    <section
      aria-label="Clasificación de riesgo"
      className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-zinc-500">Riesgo</span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${LEVEL_STYLES[risk.level].badge}`}
        >
          {RISK_LEVEL_LABEL[risk.level]}
        </span>
        {source.badge && (
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            {source.badge}
          </span>
        )}
      </div>

      <ul className="mt-2 space-y-1">
        {LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-2">
            <span className="w-20 text-zinc-600 dark:text-zinc-400">
              {RISK_LEVEL_LABEL[level]}
            </span>
            <span
              aria-hidden="true"
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
            >
              <span
                className={`block h-full ${LEVEL_STYLES[level].bar}`}
                style={{ width: pct(risk.probabilities[level]) }}
              />
            </span>
            <span className="w-12 text-right tabular-nums">
              {pct(risk.probabilities[level])}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2">
        Confianza: <span className="font-medium">{pct(risk.confidence)}</span>
        {risk.lowConfidence && (
          <span className="ml-2 font-medium text-violet-800 dark:text-violet-300">
            · Confianza baja: la clasificación es incierta
          </span>
        )}
      </p>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        Fuente: {source.detail}. Requiere validación humana; no es un diagnóstico.
      </p>
    </section>
  );
}
