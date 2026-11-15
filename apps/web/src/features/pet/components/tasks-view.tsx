"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";

import {
  CAPTURE_KINDS,
  INTERVAL_OPTIONS,
  kindInfo,
  nextRunAt,
  type CaptureKind,
  type ScheduledTask,
  type TaskRun,
} from "../tasks.logic";

type Props = {
  tasks: ScheduledTask[];
  runs: TaskRun[];
  onCreate: (input: { name: string; kind: CaptureKind; intervalMinutes: number }) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRunNow: (id: string) => void;
};

const time = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const field =
  "h-10 rounded-full bg-secondary px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function TasksView({ tasks, runs, onCreate, onToggle, onDelete, onRunNow }: Props) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CaptureKind>("heart_rate");
  const [interval, setInterval] = useState<number>(5);

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate({ name, kind, intervalMinutes: interval });
    setName("");
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la tarea"
          aria-label="Nombre de la tarea"
          maxLength={60}
          className={`${field} min-w-40 flex-1`}
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as CaptureKind)}
          aria-label="Dato a capturar"
          className={field}
        >
          {CAPTURE_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <select
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value))}
          aria-label="Frecuencia"
          className={field}
        >
          {INTERVAL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              Cada {m} min
            </option>
          ))}
        </select>
        <Button type="submit">
          <Icon name="add" />
          Programar
        </Button>
      </form>

      <section className="flex flex-col gap-2">
        <h3 className="text-base">Tareas programadas</h3>
        {tasks.length === 0 && <p className="text-sm text-ink">Todavía no programaste ninguna tarea.</p>}
        <ul className="flex flex-col gap-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-md bg-secondary px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="text-xs text-ink">
                  {kindInfo(t.kind).label} · cada {t.intervalMinutes} min ·{" "}
                  {t.enabled ? `próxima ${time.format(nextRunAt(t))}` : "en pausa"}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Ejecutar ahora" onClick={() => onRunNow(t.id)}>
                <Icon name="bolt" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t.enabled ? "Pausar" : "Reanudar"}
                onClick={() => onToggle(t.id)}
              >
                <Icon name={t.enabled ? "pause" : "play_circle"} />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Eliminar tarea" onClick={() => onDelete(t.id)}>
                <Icon name="delete" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-base">Últimas capturas</h3>
        {runs.length === 0 && <p className="text-sm text-ink">Sin capturas aún.</p>}
        <ul className="flex flex-col">
          {runs.slice(0, 10).map((r, i) => (
            <li
              key={r.id}
              className={`flex items-center justify-between gap-3 px-4 py-2 text-sm ${i % 2 === 0 ? "bg-muted" : ""}`}
            >
              <span className="truncate">{r.taskName}</span>
              <span className="shrink-0 text-ink">
                <span className="font-heading font-bold text-foreground">
                  {r.value} {r.unit}
                </span>{" "}
                · {time.format(r.at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
