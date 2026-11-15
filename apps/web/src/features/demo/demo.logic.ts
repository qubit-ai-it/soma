import type { DemoStep } from "./demo.script.ts";

export type DemoAction = "next" | "prev" | "restart";

export function totalSeconds(steps: readonly DemoStep[]): number {
  return steps.reduce((sum, step) => sum + step.durationSec, 0);
}

export function nextIndex(index: number, length: number): number {
  return Math.min(index + 1, length - 1);
}

export function prevIndex(index: number): number {
  return Math.max(index - 1, 0);
}

export function keyToAction(key: string): DemoAction | null {
  if (key === "ArrowRight" || key === " ") return "next";
  if (key === "ArrowLeft") return "prev";
  if (key === "r" || key === "R" || key === "Home") return "restart";
  return null;
}
