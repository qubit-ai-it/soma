"use client";

import { useState } from "react";

import type { PlanRecord } from "@/features/plan/plan.record";
import { DECISION_LABEL, MODE_LABEL } from "@/features/plan/plan.status";
import { SomaCard, type CardAction } from "@/shared/ui/soma-card";

import { reviewPlanAction } from "./actions";
import { useConsoleAction } from "./use-console-action";

const INPUT =
  "mt-1 w-full rounded-md bg-secondary p-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Mode = "idle" | "comment" | "changes";

export function PlanReviewCard({ plan }: { plan: PlanRecord }) {
  const { run, pending, error } = useConsoleAction();
  const [mode, setMode] = useState<Mode>("idle");
  const [note, setNote] = useState("");
  const [stepsText, setStepsText] = useState(plan.steps.join("\n"));

  function submit(decision: "approve" | "comment" | "changes") {
    const steps = stepsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const edited = decision === "changes" && steps.join("\n") !== plan.steps.join("\n");
    run((caller) =>
      reviewPlanAction({
        ...caller,
        planId: plan.id,
        decision,
        note,
        ...(edited ? { steps } : {}),
      }),
    );
  }

  const actions: CardAction[] =
    mode === "idle"
      ? [
          { label: "Aprobar", icon: "check", disabled: pending, onClick: () => submit("approve") },
          { label: "Pedir cambios", icon: "edit", variant: "secondary", disabled: pending, onClick: () => setMode("changes") },
          { label: "Comentar", icon: "chat", variant: "secondary", disabled: pending, onClick: () => setMode("comment") },
        ]
      : [
          { label: "Enviar", disabled: pending, onClick: () => submit(mode) },
          { label: "Cancelar", variant: "secondary", disabled: pending, onClick: () => setMode("idle") },
        ];

  return (
    <SomaCard
      title={`Plan ${plan.level} · Tripulante ${plan.subjectId}`}
      line={`Revisado a bordo · rev. ${plan.revision}`}
      chip="Pendiente"
      tone="warn"
      actions={actions}
      footer={`${plan.source.provider} (${MODE_LABEL[plan.source.mode]})`}
      detailLabel="Ver pasos"
      detail={
        <>
          <ol className="list-decimal space-y-1 pl-5">
            {plan.steps.map((step, index) => (
              <li key={index} className="whitespace-pre-wrap">
                {step}
              </li>
            ))}
          </ol>
          <p className="whitespace-pre-wrap">{plan.uncertainty}</p>
          {plan.reviews.map((review) => (
            <p key={review.responseId} className="rounded-md bg-secondary p-3">
              <span className="font-semibold">{DECISION_LABEL[review.decision]}</span>
              {review.note ? ` · ${review.note}` : ""}
            </p>
          ))}
        </>
      }
    >
      {mode !== "idle" && (
        <div className="space-y-2">
          {mode === "changes" && (
            <label className="block text-sm text-ink">
              Pasos (uno por línea)
              <textarea
                value={stepsText}
                onChange={(event) => setStepsText(event.target.value)}
                rows={Math.max(plan.steps.length + 1, 4)}
                className={INPUT}
              />
            </label>
          )}
          <label className="block text-sm text-ink">
            Nota (obligatoria)
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
