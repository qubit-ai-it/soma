"use client";

import { useEffect } from "react";

import {
  DIRECTION_LABELS,
  KIND_LABELS,
  STATUS_LABELS,
  errorLabel,
  formatTime,
} from "@/features/earth/earth.display";
import { MAX_ATTEMPTS } from "@/features/earth/earth.logic";
import type { Packet } from "@/features/earth/earth.types";
import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";

import { flushQueueAction } from "./actions";
import { useConsoleAction } from "./use-console-action";

const PUMP_INTERVAL_MS = 4000;

export function QueuePanel({ queue }: { queue: Packet[] }) {
  const { run, pending, error } = useConsoleAction();
  const waiting = queue.filter((p) => p.status === "queued").length;

  // Without a background worker, the console itself retries due packets
  useEffect(() => {
    if (waiting === 0) return;
    const timer = setInterval(() => {
      run((caller) => flushQueueAction({ ...caller, force: false }));
    }, PUMP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [waiting, run]);

  const ordered = [...queue].sort((a, b) => b.seq - a.seq);

  return (
    <section aria-label="Cola de salida" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-heading font-bold">Cola de paquetes</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || waiting === 0}
          onClick={() => run((caller) => flushQueueAction({ ...caller, force: true }))}
        >
          <Icon name="send" />
          Reintentar ahora
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {ordered.length === 0 ? (
        <p className="rounded-md bg-card p-4 text-sm text-ink">No hay paquetes en la cola.</p>
      ) : (
        <ul className="space-y-2" aria-live="polite">
          {ordered.map((packet) => {
            const status = STATUS_LABELS[packet.status];
            const lastError = errorLabel(packet.lastError);
            return (
              <li key={packet.id} className="rounded-md bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-heading font-semibold">
                    #{packet.seq} · {KIND_LABELS[packet.kind]}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-0.5 text-xs">
                    <Icon name={status.icon} />
                    {status.text}
                  </span>
                </div>
                <p className="mt-1 text-ink">
                  {DIRECTION_LABELS[packet.direction]} · Intentos {packet.attempts}/{MAX_ATTEMPTS}
                  {packet.status === "queued" && ` · Próximo intento ${formatTime(packet.nextAttemptAt)}`}
                  {packet.ackedAt && ` · Confirmado ${formatTime(packet.ackedAt)}`}
                  {lastError && packet.status !== "acked" && ` · ${lastError}`}
                </p>
                <p className="mt-1 break-all text-xs text-ink">Clave de idempotencia: {packet.idempotencyKey}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
