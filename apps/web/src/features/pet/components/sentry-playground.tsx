"use client";

import { useState } from "react";

import { Button } from "@/shared/ui/button";

import {
  SENTRY_DEFAULT_COLOR,
  SENTRY_MODES,
  SENTRY_PALETTE,
  type SentryMode,
} from "../pet.types";
import { Sentry } from "./sentry";

const MODE_LABELS: Record<SentryMode, string> = {
  idle: "Reposo",
  thinking: "Pensando",
  listening: "Escuchando",
  working: "Trabajando",
  warning: "Alerta",
  sleeping: "Durmiendo",
};

export function SentryPlayground() {
  const [mode, setMode] = useState<SentryMode>("idle");
  const [color, setColor] = useState<string>(SENTRY_DEFAULT_COLOR);
  const [successSignal, setSuccessSignal] = useState(0);
  const [errorSignal, setErrorSignal] = useState(0);

  const oneShotsBlocked = mode === "warning";

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
      <div className="rounded-xl border border-border bg-zinc-900 p-6">
        <Sentry
          mode={mode}
          color={color}
          successSignal={successSignal}
          errorSignal={errorSignal}
          className="mx-auto w-full max-w-md"
        />
        <p aria-live="polite" className="mt-2 text-center text-sm text-zinc-400">
          Sentry: {MODE_LABELS[mode].toLowerCase()}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-2 text-sm font-medium">Estado</h2>
          <div className="flex flex-wrap gap-2">
            {SENTRY_MODES.map((m) => (
              <Button
                key={m}
                size="sm"
                variant={m === mode ? "default" : "outline"}
                aria-pressed={m === mode}
                onClick={() => setMode(m)}
              >
                {MODE_LABELS[m]}
              </Button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium">Eventos</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSuccessSignal((n) => n + 1)}
            >
              Éxito
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setErrorSignal((n) => n + 1)}
            >
              Error
            </Button>
          </div>
          {oneShotsBlocked && (
            <p className="mt-2 text-xs text-muted-foreground">
              En alerta se ignoran los eventos; cambia de estado para salir.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium">Color</h2>
          <div className="flex gap-2">
            {SENTRY_PALETTE.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={c.name}
                aria-pressed={c.value === color}
                onClick={() => setColor(c.value)}
                style={{ backgroundColor: c.value }}
                className="size-7 rounded-full border border-border outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:ring-2 aria-pressed:ring-foreground aria-pressed:ring-offset-2 aria-pressed:ring-offset-background"
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
