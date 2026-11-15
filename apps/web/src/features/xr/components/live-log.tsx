import type { Procedure, SessionState } from "../procedure.types";
import { logActionLabel } from "../xr.display";

type Props = { procedure: Procedure; session: SessionState };

export function LiveLog({ procedure, session }: Props) {
  const titleOf = (stepId?: string) => procedure.steps.find((s) => s.id === stepId)?.title;

  return (
    <section aria-label="Registro en vivo" className="space-y-3 rounded-lg bg-card p-6">
      <h2 className="text-2xl">Registro en vivo</h2>
      {session.log.length === 0 ? (
        <p className="text-ink">Sin eventos todavía.</p>
      ) : (
        <ol className="space-y-2 text-lg">
          {session.log.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="flex flex-wrap gap-x-3">
              <time dateTime={entry.at} className="text-ink">
                {new Date(entry.at).toLocaleTimeString("es")}
              </time>
              <span>
                {logActionLabel(entry.action)}
                {titleOf(entry.stepId) && `: ${titleOf(entry.stepId)}`}
                {entry.note && ` (${entry.note})`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
