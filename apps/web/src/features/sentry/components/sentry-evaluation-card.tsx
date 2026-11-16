import { RULE_LABEL, STATUS_COPY, signalLabel, translateLimitation } from "@/features/evaluation/evaluation.labels";
import { SomaCard, type CardTone } from "@/shared/ui/soma-card";

import type { StoredEvaluation } from "../evaluations.repository";
import { generatedBy } from "../sentry.display";

const TONE: Record<StoredEvaluation["status"], CardTone> = {
  F0: "ok",
  F1: "warn",
  F2: "warn",
  F3: "danger",
  NOT_EVALUABLE: "neutral",
};

const MIN_BASELINE = 6;

export function SentryEvaluationCard({ evaluation, nowMs }: { evaluation: StoredEvaluation; nowMs: number }) {
  const copy = STATUS_COPY[evaluation.status];
  const rules = evaluation.triggeredRules.map((id) => RULE_LABEL[id] ?? id);
  const limitations = evaluation.limitations.map((code) => translateLimitation(code, MIN_BASELINE).text);
  const signals = evaluation.evidence.flatMap((e) =>
    e.kind === "signal"
      ? [`${signalLabel(e.signal)}: baseline ${Math.round(e.baseline.center)} (${e.baseline.sampleCount} observations)`]
      : [],
  );

  return (
    <SomaCard
      title={copy.summary}
      line={rules[0]}
      chip={copy.name}
      tone={TONE[evaluation.status]}
      footer={generatedBy(evaluation.evaluatedAt, nowMs)}
      detailLabel="View evidence"
      detail={
        rules.length + limitations.length + signals.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {[...rules, ...signals, ...limitations].map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        ) : undefined
      }
    />
  );
}
