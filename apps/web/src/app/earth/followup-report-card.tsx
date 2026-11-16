"use client";

import { useState } from "react";

import { describeReason, describeStatus } from "@/features/followup/followup.display";
import type { WindowReport } from "@/features/followup/followup.record";
import type { NotEvaluableReason } from "@/features/followup/followup.types";
import { SomaCard, type CardAction } from "@/shared/ui/soma-card";

import { reviewFollowUpAction } from "./actions";
import { useConsoleAction } from "./use-console-action";

const INPUT =
  "mt-1 w-full rounded-md bg-secondary p-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = { followUpId: string; subjectId: string; report: WindowReport };

export function FollowUpReportCard({ followUpId, subjectId, report }: Props) {
  const { run, pending, error } = useConsoleAction();
  const [commenting, setCommenting] = useState(false);
  const [note, setNote] = useState("");
  const reason = report.reasons[0] as NotEvaluableReason | undefined;

  function submit(decision: "ack" | "comment") {
    run((caller) =>
      reviewFollowUpAction({ ...caller, followUpId, windowId: report.windowId, decision, note }),
    );
  }

  const actions: CardAction[] = commenting
    ? [
        { label: "Enviar", disabled: pending, onClick: () => submit("comment") },
        { label: "Cancelar", variant: "secondary", disabled: pending, onClick: () => setCommenting(false) },
      ]
    : [
        { label: "Visto", icon: "check", disabled: pending, onClick: () => submit("ack") },
        { label: "Comentar", icon: "chat", variant: "secondary", disabled: pending, onClick: () => setCommenting(true) },
      ];

  return (
    <SomaCard
      title={`${report.label} · Tripulante ${subjectId}`}
      line={`${describeStatus(report.status)}${reason ? `. ${describeReason(reason)}` : ""}`}
      chip={report.escalate ? "Empeora" : "Pendiente"}
      tone={report.escalate ? "danger" : "warn"}
      actions={actions}
    >
      {commenting && (
        <label className="block text-sm text-ink">
          Nota (obligatoria)
          <input value={note} onChange={(event) => setNote(event.target.value)} className={INPUT} />
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </SomaCard>
  );
}
