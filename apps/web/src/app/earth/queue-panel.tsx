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
import { Icon } from "@/shared/ui/icon";
import { SomaCard } from "@/shared/ui/soma-card";

import { flushQueueAction } from "./actions";
import { useConsoleAction } from "./use-console-action";

const PUMP_INTERVAL_MS = 4000;

export function QueuePanel({ queue }: { queue: Packet[] }) {
  const { run, pending, error } = useConsoleAction();
  const waiting = queue.filter((p) => p.status === "queued").length;
  const sent = queue.filter((p) => p.attempts > 0).length;
  const confirmed = queue.filter((p) => p.status === "acked").length;

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
    <SomaCard
      title="Packet queue"
      line={`${waiting} queued · ${sent} sent · ${confirmed} confirmed`}
      chip={waiting > 0 ? `${waiting} queued` : "Up to date"}
      tone={waiting > 0 ? "warn" : "ok"}
      label="Outbound queue"
      actions={[
        {
          label: "Retry now",
          icon: "send",
          disabled: pending || waiting === 0,
          onClick: () => run((caller) => flushQueueAction({ ...caller, force: true })),
        },
      ]}
      detail={
        ordered.length === 0 ? (
          <p>No packets in the queue.</p>
        ) : (
          <ul className="space-y-3" aria-live="polite">
            {ordered.map((packet) => {
              const status = STATUS_LABELS[packet.status];
              const lastError = errorLabel(packet.lastError);
              return (
                <li key={packet.id} className="space-y-1">
                  <p className="flex items-center gap-2 font-heading font-semibold">
                    #{packet.seq} · {KIND_LABELS[packet.kind]}
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-normal">
                      <Icon name={status.icon} />
                      {status.text}
                    </span>
                  </p>
                  <p>
                    {DIRECTION_LABELS[packet.direction]} · Attempts {packet.attempts}/{MAX_ATTEMPTS}
                    {packet.status === "queued" && ` · Next attempt ${formatTime(packet.nextAttemptAt)}`}
                    {packet.ackedAt && ` · Confirmed ${formatTime(packet.ackedAt)}`}
                    {lastError && packet.status !== "acked" && ` · ${lastError}`}
                  </p>
                  <p className="break-all text-xs">Idempotency key: {packet.idempotencyKey}</p>
                </li>
              );
            })}
          </ul>
        )
      }
    >
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </SomaCard>
  );
}
