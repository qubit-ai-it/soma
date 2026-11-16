import type { RiskLevel } from "../classifier.port";
import { describeSource, RISK_LEVEL_LABEL } from "../risk.display";
import type { RiskBadgeDTO } from "../risk.types";
import { LEVEL_STYLES } from "./risk-styles";

const LEVELS: RiskLevel[] = ["low", "moderate", "high"];

const PANEL = "rounded-[2rem_1.5rem_2.25rem_1.75rem] bg-card p-6";

const pct = (value: number) => `${Math.round(value * 100)} %`;

export function RiskPanel({ risk }: { risk: RiskBadgeDTO | null }) {
  if (!risk) {
    return (
      <section aria-label="Clasificación de riesgo" className={`${PANEL} h-full text-sm text-ink`}>
        Riesgo no disponible.
      </section>
    );
  }

  const source = describeSource(risk);
  return (
    <section aria-label="Clasificación de riesgo" className={`${PANEL} flex h-full flex-col gap-6`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base text-muted-foreground">Riesgo</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${LEVEL_STYLES[risk.level].badge}`}>
            {RISK_LEVEL_LABEL[risk.level]}
          </span>
          {source.badge && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{source.badge}</span>
          )}
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
          Confianza {pct(risk.confidence)}
        </span>
      </header>

      <ul className="grid min-h-64 flex-1 grid-cols-3 gap-4">
        {LEVELS.map((level) => {
          const value = risk.probabilities[level];
          const top = level === risk.level;
          return (
            <li key={level} className="flex flex-col gap-3">
              <div className="relative flex-1">
                <span
                  className="absolute inset-x-0 text-center font-heading text-xl font-bold tabular-nums"
                  style={{ bottom: `calc(${value * 100}% + 0.5rem)` }}
                >
                  {pct(value)}
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-1 bottom-0 rounded-t-2xl rounded-b-md ${LEVEL_STYLES[level].bar} ${top ? "" : "opacity-80"}`}
                  style={{ height: `${Math.max(value * 100, 2)}%` }}
                />
              </div>
              <span className={`text-center text-sm ${top ? "font-semibold" : "text-ink"}`}>
                {RISK_LEVEL_LABEL[level]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
