import type { Attention } from "../crew.types";

const ATTENTION_STYLES: Record<Attention, { label: string; className: string }> = {
  nominal: {
    label: "Nominal",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  watch: {
    label: "Vigilar",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  review: {
    label: "Revisar",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

export function AttentionBadge({ attention }: { attention: Attention }) {
  const { label, className } = ATTENTION_STYLES[attention];
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>{label}</span>
  );
}
