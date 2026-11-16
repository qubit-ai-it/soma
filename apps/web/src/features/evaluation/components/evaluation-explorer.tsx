"use client";

import { useState } from "react";

import { Icon } from "@/shared/ui/icon";
import { SomaCard, type CardTone } from "@/shared/ui/soma-card";
import type { Status } from "../../rules/rules.types";
import { STATUS_COPY } from "../evaluation.labels";
import type { EvaluationBoard } from "../evaluation.types";
import { EvidencePanel } from "./evidence-panel";
import { ProtocolCard } from "./protocol-card";
import { SignalChart } from "./signal-chart";
import { StatusBadge } from "./status-badge";

const TONE: Record<Status, CardTone> = {
  F0: "ok",
  F1: "warn",
  F2: "danger",
  F3: "danger",
  NOT_EVALUABLE: "info",
};

export function EvaluationExplorer({ board }: { board: EvaluationBoard }) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [checkpointIndex, setCheckpointIndex] = useState(0);

  const scenario = board.scenarios[scenarioIndex];
  const checkpoint = scenario.checkpoints[checkpointIndex];
  const last = scenario.checkpoints.length - 1;
  const copy = STATUS_COPY[checkpoint.status];

  function selectScenario(index: number) {
    setScenarioIndex(index);
    setCheckpointIndex(0);
  }

  return (
    <section aria-label="Deterministic engine evaluation" className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">Evaluation</h2>
        <p role="note" className="mt-1 text-sm text-ink">
          Not a clinical scale or a diagnosis
        </p>
      </div>

      <div className="space-y-3">
        <ul aria-label="Scenario" className="flex flex-wrap gap-2">
          {board.scenarios.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={index === scenarioIndex}
                onClick={() => selectScenario(index)}
                className={`rounded-full px-4 py-2 font-heading text-sm font-semibold outline-none transition-colors duration-[var(--duration-micro)] ease-[var(--ease-editorial)] focus-visible:ring-2 focus-visible:ring-ring ${
                  index === scenarioIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-secondary"
                }`}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink">{scenario.description}</p>

        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={checkpointIndex}
          onChange={(event) => setCheckpointIndex(Number(event.target.value))}
          aria-label="Checkpoint"
          aria-valuetext={`${checkpoint.label}, ${copy.name}`}
          className="w-full accent-[var(--signal)]"
        />
        <ol className="flex flex-wrap gap-2">
          {scenario.checkpoints.map((item) => (
            <li key={item.index}>
              <button
                type="button"
                aria-current={item.index === checkpointIndex ? "step" : undefined}
                onClick={() => setCheckpointIndex(item.index)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs outline-none transition-colors duration-[var(--duration-micro)] ease-[var(--ease-editorial)] focus-visible:ring-2 focus-visible:ring-ring ${
                  item.index === checkpointIndex ? "bg-secondary" : "bg-card hover:bg-secondary"
                }`}
              >
                <span>{item.index + 1}</span>
                <StatusBadge status={item.status} />
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div aria-live="polite" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SomaCard
          label="Status"
          tone={TONE[checkpoint.status]}
          chip={checkpoint.label}
          title={copy.name}
          line={checkpoint.status === "NOT_EVALUABLE" ? "Data missing. Not F0." : copy.summary}
          actions={[
            {
              label: "Next",
              icon: "chevron_right",
              disabled: checkpointIndex === last,
              onClick: () => setCheckpointIndex(checkpointIndex + 1),
            },
            {
              label: "Previous",
              icon: "chevron_left",
              variant: "secondary",
              disabled: checkpointIndex === 0,
              onClick: () => setCheckpointIndex(checkpointIndex - 1),
            },
          ]}
        />

        <EvidencePanel checkpoint={checkpoint} />

        {checkpoint.status === "F3" && <ProtocolCard />}

        <SomaCard
          label="Charts"
          title="Signals"
          line={`${checkpoint.signals.length} charts`}
          detailLabel="View charts"
          detail={
            <div className="grid gap-3 sm:grid-cols-2">
              {checkpoint.signals.map((signal) => (
                <SignalChart key={signal.signal} signal={signal} />
              ))}
            </div>
          }
        />
      </div>

      <p className="flex items-center gap-2 text-xs text-ink">
        <Icon name="science" />
        A missing value never counts as zero.
      </p>
    </section>
  );
}
