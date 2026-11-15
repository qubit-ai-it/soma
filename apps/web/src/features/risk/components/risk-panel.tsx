import type { RiskLevel } from "../classifier.port";
import { describeSource, RISK_LEVEL_LABEL } from "../risk.display";
import type { RiskBadgeDTO } from "../risk.types";
import { LEVEL_STYLES } from "./risk-styles";

const LEVELS: RiskLevel[] = ["low", "moderate", "high"];

const pct = (value: number) => `${Math.round(value * 100)} %`;

export function RiskPanel({ risk }: { risk: RiskBadgeDTO | null }) {
  if (!risk) {
    return (
      <section aria-label="Clasificación de riesgo" className="text-sm text-ink">
        Clasificación de riesgo no disponible.
      </section>
    );
  }

  const source = describeSource(risk);
  return (
    <section
      aria-label="Clasificación de riesgo"
      className="rounded-md bg-card p-5 text-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink">Riesgo</span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${LEVEL_STYLES[risk.level].badge}`}
        >
          {RISK_LEVEL_LABEL[risk.level]}
        </span>
        {source.badge && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
            {source.badge}
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-2">
            <span className="w-20 text-ink">
              {RISK_LEVEL_LABEL[level]}
            </span>
            <span
              aria-hidden="true"
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
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

      <p className="mt-4">
        Confianza: <span className="font-medium">{pct(risk.confidence)}</span>
        {risk.lowConfidence && (
          <span className="ml-2 font-medium text-signal">
            · Confianza baja: la clasificación es incierta
          </span>
        )}
      </p>
      <p className="mt-2 text-xs text-ink">
        Requiere validación humana; no es un diagnóstico.
      </p>
    </section>
  );
}
