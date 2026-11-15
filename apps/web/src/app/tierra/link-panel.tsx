"use client";

import { formatTime } from "@/features/earth/earth.display";
import type { LinkState } from "@/features/earth/earth.types";
import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";

import { setLinkAction } from "./actions";
import { useConsoleAction } from "./use-console-action";

const LATENCIES = [600, 1200, 5000, 20000];

export function LinkPanel({ link }: { link: LinkState }) {
  const { run, pending, error } = useConsoleAction();
  const connected = link.status === "connected";

  return (
    <section aria-label="Estado del enlace" className="space-y-4 rounded-md bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-heading text-lg font-bold">
          <Icon name={connected ? "wifi" : "wifi_off"} />
          Enlace {connected ? "conectado" : "desconectado"}
        </p>
        <Button
          variant={connected ? "outline" : "default"}
          disabled={pending}
          onClick={() =>
            run((caller) =>
              setLinkAction({ ...caller, patch: { status: connected ? "disconnected" : "connected" } }),
            )
          }
        >
          {connected ? "Cortar enlace" : "Restablecer enlace"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <label className="flex items-center gap-2 text-ink">
          Latencia simulada
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
        <label className="flex items-center gap-2 text-ink">
          <input
            type="checkbox"
            checked={link.ackLoss}
            disabled={pending}
            onChange={(event) =>
              run((caller) => setLinkAction({ ...caller, patch: { ackLoss: event.target.checked } }))
            }
            className="size-4 accent-[var(--accent)]"
          />
          Simular pérdida de confirmaciones
        </label>
        <span className="text-ink">Último cambio: {formatTime(link.updatedAt)}</span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <p className="text-xs text-ink">
        Enlace simulado: la cola reproduce el comportamiento de almacenar y reenviar, no es una
        implementación real de DTN.
      </p>
    </section>
  );
}
