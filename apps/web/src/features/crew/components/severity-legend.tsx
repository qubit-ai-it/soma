import type { Severity } from "../crew.types";
import { SEVERITY_META } from "./severity";

export function SeverityLegend() {
  return (
    <ul aria-label="Leyenda de gravedad" className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {(Object.keys(SEVERITY_META) as Severity[]).map((key) => (
        <li key={key} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`inline-block size-3 rounded-sm ${SEVERITY_META[key].swatch}`}
          />
          {SEVERITY_META[key].label}
        </li>
      ))}
    </ul>
  );
}
