"use client";

import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";
import { PROVENANCE_LABEL, STATUS_COPY } from "../evaluation.labels";
import type { EvaluationBoard } from "../evaluation.types";
import { EvidencePanel } from "./evidence-panel";
import { ProtocolCard } from "./protocol-card";
import { SignalChart } from "./signal-chart";
import { StatusBadge } from "./status-badge";

const dateFormat = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function EvaluationExplorer({ board }: { board: EvaluationBoard }) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [checkpointIndex, setCheckpointIndex] = useState(0);

  const scenario = board.scenarios[scenarioIndex];
  const checkpoint = scenario.checkpoints[checkpointIndex];
  const last = scenario.checkpoints.length - 1;

  function selectScenario(index: number) {
    setScenarioIndex(index);
    setCheckpointIndex(0);
  }

  return (
    <section aria-label="Evaluación del motor determinista" className="space-y-8">
      <aside
        role="note"
        className="flex gap-3 rounded-md bg-accent-soft p-4 text-sm"
      >
        <Icon name="science" className="mt-0.5 shrink-0" />
        <p>
          Datos sintéticos y reglas de demostración. F0–F3 es la escala interna de SOMA, no una
          escala clínica. El motor determinista decide; SOMA apoya decisiones y no diagnostica ni
          prescribe.
        </p>
      </aside>

      <div>
        <h3 className="text-xl">Escenario</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {board.scenarios.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={index === scenarioIndex}
                onClick={() => selectScenario(index)}
                className={`rounded-full px-4 py-2 font-heading text-sm font-semibold transition-colors duration-[var(--duration-micro)] ease-[var(--ease-editorial)] ${
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
        <p className="mt-3 text-sm text-ink">{scenario.description}</p>
        <p className="mt-1 text-xs text-ink">
          Procedencia: {scenario.provenanceTypes.map((t) => PROVENANCE_LABEL[t]).join(", ")} · Reglas{" "}
          {scenario.ruleSetVersion} · Motor {scenario.engineVersion}
        </p>
      </div>

      <div>
        <h3 className="text-xl">Punto de control</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Punto de control anterior"
            disabled={checkpointIndex === 0}
            onClick={() => setCheckpointIndex(checkpointIndex - 1)}
          >
            <Icon name="chevron_left" />
          </Button>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={checkpointIndex}
            onChange={(event) => setCheckpointIndex(Number(event.target.value))}
            aria-label="Punto de control"
            aria-valuetext={`${checkpoint.label}, ${STATUS_COPY[checkpoint.status].name}`}
            className="min-w-40 flex-1 accent-[var(--signal)]"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Punto de control siguiente"
            disabled={checkpointIndex === last}
            onClick={() => setCheckpointIndex(checkpointIndex + 1)}
          >
            <Icon name="chevron_right" />
          </Button>
        </div>
        <ol className="mt-3 flex flex-wrap gap-2">
          {scenario.checkpoints.map((item) => (
            <li key={item.index}>
              <button
                type="button"
                aria-current={item.index === checkpointIndex ? "step" : undefined}
                onClick={() => setCheckpointIndex(item.index)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors duration-[var(--duration-micro)] ease-[var(--ease-editorial)] ${
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

      <div aria-live="polite" className="rounded-md bg-card p-5">
        <p className="text-sm text-ink">
          {checkpoint.label} · {dateFormat.format(new Date(checkpoint.evaluatedAt))} UTC
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <StatusBadge status={checkpoint.status} large />
          <p className="text-lg">{STATUS_COPY[checkpoint.status].summary}</p>
        </div>
      </div>

      {checkpoint.status === "F3" && <ProtocolCard />}

      <EvidencePanel checkpoint={checkpoint} />

      <div>
        <h3 className="text-xl">Señales</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {checkpoint.signals.map((signal) => (
            <SignalChart key={signal.signal} signal={signal} />
          ))}
        </div>
      </div>

      <p className="text-xs text-ink">
        Datos sintéticos. Umbrales de demostración propios del proyecto, no guía clínica. Un valor
        faltante nunca se trata como cero.
      </p>
    </section>
  );
}
