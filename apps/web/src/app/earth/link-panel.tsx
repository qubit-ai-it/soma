"use client";

import { formatTime } from "@/features/earth/earth.display";
import type { LinkState } from "@/features/earth/earth.types";
import { SomaCard } from "@/shared/ui/soma-card";

import { setLinkAction } from "./actions";
import { useConsoleAction } from "./use-console-action";

const LATENCIES = [600, 1200, 5000, 20000];

export function LinkPanel({ link }: { link: LinkState }) {
  const { run, pending, error } = useConsoleAction();
  const connected = link.status === "connected";

  return (
    <SomaCard
      title={`Earth link: ${connected ? "connected" : "down"}`}
      chip={connected ? "Connected" : "Down"}
      tone={connected ? "ok" : "danger"}
      label="Link status"
      actions={[
        {
          label: connected ? "Cut link" : "Restore link",
          icon: connected ? "wifi_off" : "wifi",
          variant: connected ? "secondary" : "primary",
          disabled: pending,
          onClick: () =>
            run((caller) =>
              setLinkAction({ ...caller, patch: { status: connected ? "disconnected" : "connected" } }),
            ),
        },
      ]}
      detail={
        <>
          <label className="flex items-center gap-2">
            Latency
            <select
              value={link.latencyMs}
              disabled={pending}
              onChange={(event) =>
                run((caller) => setLinkAction({ ...caller, patch: { latencyMs: Number(event.target.value) } }))
              }
              className="rounded-md bg-secondary px-2 py-1 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {[...new Set([...LATENCIES, link.latencyMs])].sort((a, b) => a - b).map((ms) => (
                <option key={ms} value={ms}>
                  {ms} ms
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={link.ackLoss}
              disabled={pending}
              onChange={(event) =>
                run((caller) => setLinkAction({ ...caller, patch: { ackLoss: event.target.checked } }))
              }
              className="size-4 accent-[var(--accent)]"
            />
            Acknowledgement loss
          </label>
          <p>Last change: {formatTime(link.updatedAt)}</p>
        </>
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
