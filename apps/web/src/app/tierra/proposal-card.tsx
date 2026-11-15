"use client";

import { useState } from "react";

import { DECISION_LABELS, STATUS_LABELS, formatTime } from "@/features/earth/earth.display";
import type { Packet, Proposal } from "@/features/earth/earth.types";
import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";

import { reviewProposalAction } from "./actions";
import { useConsoleAction } from "./use-console-action";

type Props = {
  proposal: Proposal;
  packet: Packet | undefined;
};

export function ProposalCard({ proposal, packet }: Props) {
  const { run, pending, error } = useConsoleAction();
  const [mode, setMode] = useState<"idle" | "modify" | "reject">("idle");
  const [stepsText, setStepsText] = useState(proposal.steps.join("\n"));
  const [note, setNote] = useState("");
  const review = proposal.review;

  function submit(decision: "approve" | "modify" | "reject") {
    const steps = stepsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const body =
      decision === "approve"
        ? { proposalId: proposal.id, decision, note }
        : decision === "modify"
          ? { proposalId: proposal.id, decision, steps, note }
          : { proposalId: proposal.id, decision, note };
    run((caller) => reviewProposalAction({ ...caller, review: body }));
  }

  return (
    <article aria-label={proposal.title} className="space-y-3 rounded-md bg-card p-5">
      <header className="space-y-1">
        <h3 className="font-heading text-lg font-bold">{proposal.title}</h3>
        <p className="text-sm text-ink">
          {proposal.subject.label} · Fuente {proposal.source.provider} · versión {proposal.source.version} ·
          Recibida {formatTime(proposal.createdAt)}
        </p>
        <p className="text-xs text-ink">
          Borrador generado por IA: no es un diagnóstico ni una prescripción y requiere validación humana.
        </p>
      </header>

      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {proposal.steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>

      {review ? (
        <div className="space-y-1 rounded-md bg-secondary p-3 text-sm" aria-live="polite">
          <p className="flex items-center gap-2 font-heading font-semibold">
            <Icon name="how_to_reg" />
            {DECISION_LABELS[review.decision]} por {review.actorId} · {formatTime(review.decidedAt)}
          </p>
          {review.note && <p className="text-ink">Nota: {review.note}</p>}
          {review.steps && (
            <ol className="list-decimal pl-5 text-ink">
              {review.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          )}
          {packet && (
            <p className="flex items-center gap-1 text-ink">
              <Icon name={STATUS_LABELS[packet.status].icon} />
              Respuesta a la estación: {STATUS_LABELS[packet.status].text.toLowerCase()}
              {packet.status === "queued" && ` (intentos ${packet.attempts})`}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {mode !== "idle" && (
            <div className="space-y-2">
              {mode === "modify" && (
                <label className="block text-sm text-ink">
                  Pasos (uno por línea)
                  <textarea
                    value={stepsText}
                    onChange={(event) => setStepsText(event.target.value)}
                    rows={Math.max(proposal.steps.length + 1, 4)}
                    className="mt-1 w-full rounded-md bg-secondary p-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
              )}
              <label className="block text-sm text-ink">
                Nota (obligatoria)
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-1 w-full rounded-md bg-secondary p-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <div className="flex gap-2">
                <Button disabled={pending} onClick={() => submit(mode)}>
                  Enviar {mode === "modify" ? "modificación" : "rechazo"}
                </Button>
                <Button variant="ghost" disabled={pending} onClick={() => setMode("idle")}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          {mode === "idle" && (
            <div className="flex flex-wrap gap-2">
              <Button disabled={pending} onClick={() => submit("approve")}>
                <Icon name="check" />
                Aprobar
              </Button>
              <Button variant="outline" disabled={pending} onClick={() => setMode("modify")}>
                <Icon name="edit" />
                Modificar
              </Button>
              <Button variant="destructive" disabled={pending} onClick={() => setMode("reject")}>
                <Icon name="close" />
                Rechazar
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
