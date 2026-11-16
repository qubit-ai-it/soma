export type ChartPoint = { x: number; y: number };
export type ChartRange = { low?: number; high?: number };
export type ChartBox = { width: number; height: number; padX: number; padY: number };

export type ChartDomain = { min: number; max: number };

// The domain always covers the readings and the reference range, so the band is never clipped away
export function chartDomain(values: readonly number[], range: ChartRange = {}): ChartDomain {
  const all = [...values, ...(range.low === undefined ? [] : [range.low]), ...(range.high === undefined ? [] : [range.high])];
  if (all.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...all);
  const max = Math.max(...all);
  if (min === max) return { min: min - 1, max: max + 1 };
  const margin = (max - min) * 0.1;
  return { min: min - margin, max: max + margin };
}

export function scaleY(value: number, domain: ChartDomain, box: ChartBox): number {
  const ratio = (value - domain.min) / (domain.max - domain.min);
  return box.height - box.padY - ratio * (box.height - box.padY * 2);
}

export function scaleSeries(values: readonly number[], domain: ChartDomain, box: ChartBox): ChartPoint[] {
  const span = box.width - box.padX * 2;
  return values.map((value, index) => ({
    x: values.length === 1 ? box.width / 2 : box.padX + (index / (values.length - 1)) * span,
    y: scaleY(value, domain, box),
  }));
}

const fmt = (n: number) => n.toFixed(1);

export function linePath(points: readonly ChartPoint[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x)} ${fmt(p.y)}`).join(" ");
}

export function areaPath(points: readonly ChartPoint[], box: ChartBox): string {
  if (points.length === 0) return "";
  const floor = fmt(box.height - box.padY);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${fmt(last.x)} ${floor} L${fmt(first.x)} ${floor} Z`;
}

// Reference range as a horizontal band; an open end runs to the edge of the chart
export function referenceBand(
  range: ChartRange,
  domain: ChartDomain,
  box: ChartBox,
): { y: number; height: number } | null {
  if (range.low === undefined && range.high === undefined) return null;
  const top = range.high === undefined ? box.padY : scaleY(range.high, domain, box);
  const bottom = range.low === undefined ? box.height - box.padY : scaleY(range.low, domain, box);
  return { y: Math.min(top, bottom), height: Math.abs(bottom - top) };
}

export type RangeStatus = "low" | "normal" | "high";

export function rangeStatus(value: number, range: ChartRange): RangeStatus {
  if (range.low !== undefined && value < range.low) return "low";
  if (range.high !== undefined && value > range.high) return "high";
  return "normal";
}
