"use client";

import { useState } from "react";

import { DECISION_LABELS, STATUS_LABELS, formatTime } from "@/features/earth/earth.display";
import type { Packet, Proposal } from "@/features/earth/earth.types";
import { Icon } from "@/shared/ui/icon";
import { SomaCard, type CardAction } from "@/shared/ui/soma-card";

import { reviewProposalAction } from "./actions";
import { useConsoleAction } from "./use-console-action";

type Props = {
  proposal: Proposal;
  packet: Packet | undefined;
};

const INPUT =
  "mt-1 w-full rounded-md bg-secondary p-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

  let actions: CardAction[] = [];
  if (!review) {
    actions =
      mode === "idle"
        ? [
            { label: "Approve", icon: "check", disabled: pending, onClick: () => submit("approve") },
            {
              label: "Reject",
              icon: "close",
              variant: "secondary",
              disabled: pending,
              onClick: () => setMode("reject"),
            },
          ]
        : [
            {
              label: mode === "modify" ? "Send modification" : "Send rejection",
              disabled: pending,
              onClick: () => submit(mode),
            },
            { label: "Cancel", variant: "secondary", disabled: pending, onClick: () => setMode("idle") },
          ];
  }

  return (
    <SomaCard
      title={proposal.title}
      line={"AI draft"}
      chip={review ? DECISION_LABELS[review.decision] : "Pending"}
      tone={review ? "ok" : "warn"}
      actions={actions}
      detail={
        <>
          <p>
            {proposal.subject.label} · Received {formatTime(proposal.createdAt)}
          </p>
          <p className="text-xs">
            AI-generated draft: not a diagnosis or a prescription, and it requires human validation.
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            {proposal.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          {review && (
            <div className="space-y-1 rounded-md bg-secondary p-3" aria-live="polite">
              <p className="flex items-center gap-2 font-heading font-semibold">
                <Icon name="how_to_reg" />
                {DECISION_LABELS[review.decision]} by {review.actorId} · {formatTime(review.decidedAt)}
              </p>
              {review.note && <p>Note: {review.note}</p>}
              {review.steps && (
                <ol className="list-decimal pl-5">
                  {review.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              )}
              {packet && (
                <p className="flex items-center gap-1">
                  <Icon name={STATUS_LABELS[packet.status].icon} />
                  Response to the station: {STATUS_LABELS[packet.status].text.toLowerCase()}
                  {packet.status === "queued" && ` (attempts ${packet.attempts})`}
                </p>
              )}
            </div>
          )}
          {!review && mode === "idle" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => setMode("modify")}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-4 py-2 font-heading text-sm font-semibold text-foreground outline-none hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Icon name="edit" />
              Edit steps
            </button>
          )}
        </>
      }
    >
      {review && (
        <p className="flex items-center gap-2 text-sm text-ink" aria-live="polite">
          <Icon name={packet ? STATUS_LABELS[packet.status].icon : "how_to_reg"} />
          {packet ? STATUS_LABELS[packet.status].text : DECISION_LABELS[review.decision]}
        </p>
      )}
      {!review && mode !== "idle" && (
        <div className="space-y-2">
          {mode === "modify" && (
            <label className="block text-sm text-ink">
              Steps (one per line)
              <textarea
                value={stepsText}
                onChange={(event) => setStepsText(event.target.value)}
                rows={Math.max(proposal.steps.length + 1, 4)}
                className={INPUT}
              />
            </label>
          )}
          <label className="block text-sm text-ink">
            Note (required)
            <input value={note} onChange={(event) => setNote(event.target.value)} className={INPUT} />
          </label>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </SomaCard>
  );
}
