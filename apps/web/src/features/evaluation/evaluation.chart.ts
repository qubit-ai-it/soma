import type { QualityState } from "../observation/observation.types.ts";
import type { SignalView } from "./evaluation.types.ts";

export type ChartLayout = { width: number; height: number; padX: number; padY: number };

export type ChartDot = { index: number; x: number; y: number; value: number; quality: QualityState };
export type ChartGap = { index: number; x: number };

export type Chart = {
  segments: string[];
  dots: ChartDot[];
  gaps: ChartGap[];
  band: { y: number; height: number } | null;
  baselineCutX: number;
};

export function buildChart(signal: SignalView, layout: ChartLayout): Chart {
  const innerWidth = layout.width - layout.padX * 2;
  const innerHeight = layout.height - layout.padY * 2;
  const span = signal.domain.max - signal.domain.min || 1;
  const steps = Math.max(signal.totalPoints - 1, 1);

  const xAt = (index: number) => layout.padX + (index / steps) * innerWidth;
  const yAt = (value: number) => layout.padY + ((signal.domain.max - value) / span) * innerHeight;

  const dots: ChartDot[] = [];
  const gaps: ChartGap[] = [];
  const runs: ChartDot[][] = [];
  let run: ChartDot[] = [];

  for (const point of signal.points) {
    if (point.value === null) {
      gaps.push({ index: point.index, x: xAt(point.index) });
      if (run.length > 0) runs.push(run);
      run = [];
      continue;
    }
    const dot = {
      index: point.index,
      x: xAt(point.index),
      y: yAt(point.value),
      value: point.value,
      quality: point.quality,
    };
    dots.push(dot);
    run.push(dot);
  }
  if (run.length > 0) runs.push(run);

  const segments = runs
    .filter((r) => r.length > 1)
    .map((r) => r.map((d, i) => `${i === 0 ? "M" : "L"}${d.x} ${d.y}`).join(" "));

  const band =
    signal.baseline.status === "ready"
      ? {
          y: yAt(signal.baseline.band.high),
          height: yAt(signal.baseline.band.low) - yAt(signal.baseline.band.high),
        }
      : null;

  return { segments, dots, gaps, band, baselineCutX: xAt(signal.baselineEndIndex + 0.5) };
}
