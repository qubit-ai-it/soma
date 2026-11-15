"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/ui/button";
import Aurora from "@/shared/ui/aurora";
import { Icon } from "@/shared/ui/icon";

import type { SentryMode } from "../pet.types";
import { Sentry } from "./sentry";

type Props = {
  mode: SentryMode;
  speaking: boolean;
  status: string;
  transcript: string;
  successSignal: number;
  errorSignal: number;
  onEnd: () => void;
};

function readToken(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function auroraLevel(mode: SentryMode, speaking: boolean) {
  if (speaking) return { amplitude: 1.3, brightness: 1.1 };
  if (mode === "listening") return { amplitude: 1.6, brightness: 1.2 };
  if (mode === "thinking") return { amplitude: 0.9, brightness: 0.9 };
  return { amplitude: 0.7, brightness: 0.8 };
}

export function VoiceStage({
  mode,
  speaking,
  status,
  transcript,
  successSignal,
  errorSignal,
  onEnd,
}: Props) {
  const endRef = useRef<HTMLButtonElement>(null);
  const [colors] = useState(() => [
    readToken("--accent", "#2f4bd8"),
    readToken("--signal", "#5aa0f0"),
    readToken("--accent", "#2f4bd8"),
  ]);
  const level = auroraLevel(mode, speaking);

  useEffect(() => {
    endRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onEnd();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEnd]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Modo conversación"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-background px-5 py-10"
    >
      <Aurora
        direction="bottom"
        colorStops={colors}
        height={0.5}
        amplitude={level.amplitude}
        brightness={level.brightness}
        blend={0.7}
        speed={0.8}
        mouseInteraction={false}
        className="pointer-events-none absolute inset-0"
      />

      <div aria-hidden="true" />

      <div className="relative flex w-full flex-col items-center gap-6">
        <Sentry
          mode={mode}
          successSignal={successSignal}
          errorSignal={errorSignal}
          label="Sentry en modo conversación"
          className="w-[min(75vw,26rem)]"
        />
        <p aria-live="polite" className="font-heading text-2xl font-bold">
          {status}
        </p>
        <p className="line-clamp-2 min-h-12 max-w-xl text-center text-ink">{transcript}</p>
      </div>

      <Button
        ref={endRef}
        variant="destructive"
        size="icon-lg"
        aria-label="Terminar conversación"
        onClick={onEnd}
        className="relative"
      >
        <Icon name="close" />
      </Button>
    </div>
  );
}
