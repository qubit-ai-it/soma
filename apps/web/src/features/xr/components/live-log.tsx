import { SomaCard } from "@/shared/ui/soma-card";

import type { Procedure, SessionState } from "../procedure.types";
import { logActionLabel } from "../xr.display";

type Props = { procedure: Procedure; session: SessionState };

export function LiveLog({ procedure, session }: Props) {
  const titleOf = (stepId?: string) => procedure.steps.find((s) => s.id === stepId)?.title;
  const count = session.log.length;

  return (
    <SomaCard
      label="Live log"
      title="Live log"
      line={count === 0 ? "No events yet." : `${count} ${count === 1 ? "event" : "events"}`}
      detailLabel="View log"
      detail={
        count > 0 && (
          <ol className="space-y-2">
            {session.log.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex flex-wrap gap-x-3">
                <time dateTime={entry.at} className="text-muted-foreground">
                  {new Date(entry.at).toLocaleTimeString("en-US")}
                </time>
                <span>
                  {logActionLabel(entry.action)}
                  {titleOf(entry.stepId) && `: ${titleOf(entry.stepId)}`}
                  {entry.note && ` (${entry.note})`}
                </span>
              </li>
            ))}
          </ol>
        )
      }
    />
  );
}
