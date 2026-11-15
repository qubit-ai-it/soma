"use client";

import { useState } from "react";

import Aurora from "@/shared/ui/aurora";

import type { SentryMode } from "../pet.types";

type Props = {
  mode: SentryMode;
  speaking: boolean;
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

export function VoiceBackdrop({ mode, speaking }: Props) {
  const [colors] = useState(() => [
    readToken("--accent", "#2f4bd8"),
    readToken("--signal", "#5aa0f0"),
    readToken("--accent", "#2f4bd8"),
  ]);
  const level = auroraLevel(mode, speaking);

  return (
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
  );
}
